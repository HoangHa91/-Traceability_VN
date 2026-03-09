"""
DAG: moit_traceability_batch
Schedule: Daily at 00:00 (Vietnam time, UTC+7 = UTC 17:00)
Purpose: Orchestrate the full batch ingestion, validation, linking, and storage pipeline
         for the MoIT National Food Traceability Hub.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.utils.trigger_rule import TriggerRule

# ---------------------------------------------------------------------------
# Default args
# ---------------------------------------------------------------------------
default_args = {
    "owner": "moit-traceability",
    "depends_on_past": False,
    "email": ["traceability-ops@moit.gov.vn"],
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=10),
    "execution_timeout": timedelta(hours=4),
}

# ---------------------------------------------------------------------------
# DAG definition
# ---------------------------------------------------------------------------
with DAG(
    dag_id="moit_traceability_batch",
    description="MoIT National Food Traceability – Daily Batch Pipeline",
    default_args=default_args,
    schedule_interval="0 17 * * *",  # 00:00 ICT = 17:00 UTC
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["moit", "traceability", "batch", "production"],
) as dag:

    # -----------------------------------------------------------------------
    # STAGE 0: Start marker
    # -----------------------------------------------------------------------
    start = EmptyOperator(task_id="start")

    # -----------------------------------------------------------------------
    # STAGE 1: Collect raw files from all ingestion sources
    # -----------------------------------------------------------------------
    def collect_sftp_drops(**context):
        """
        Scan SFTP/S3 inbox for files uploaded since last run.
        Move valid files to processing staging area.
        Returns list of batch_ids created.
        """
        from ingestion.sftp_watcher.collector import SFTPCollector
        execution_date = context["ds"]  # YYYY-MM-DD
        collector = SFTPCollector(execution_date=execution_date)
        batch_ids = collector.collect_and_stage()
        context["ti"].xcom_push(key="sftp_batch_ids", value=batch_ids)
        return f"Collected {len(batch_ids)} SFTP batches"

    def collect_api_batches(**context):
        """
        Fetch all pending Bulk API batches submitted since cut-off yesterday.
        """
        from ingestion.bulk_api.collector import APIBatchCollector
        execution_date = context["ds"]
        collector = APIBatchCollector(execution_date=execution_date)
        batch_ids = collector.collect_pending()
        context["ti"].xcom_push(key="api_batch_ids", value=batch_ids)
        return f"Collected {len(batch_ids)} API batches"

    collect_sftp = PythonOperator(
        task_id="collect_sftp_drops",
        python_callable=collect_sftp_drops,
    )

    collect_api = PythonOperator(
        task_id="collect_api_batches",
        python_callable=collect_api_batches,
    )

    # -----------------------------------------------------------------------
    # STAGE 2: Validate all collected batches
    # -----------------------------------------------------------------------
    def validate_all_batches(**context):
        """
        Run Pydantic + Pandas validation on every batch.
        Mandatory fields: product_id, location_id, timestamp, lot_number.
        Invalid records are quarantined; valid records proceed.
        """
        from processing.validation.engine import ValidationEngine
        sftp_ids = context["ti"].xcom_pull(key="sftp_batch_ids", task_ids="collect_sftp_drops") or []
        api_ids  = context["ti"].xcom_pull(key="api_batch_ids",  task_ids="collect_api_batches") or []
        all_ids  = sftp_ids + api_ids

        engine = ValidationEngine()
        results = engine.validate_batches(all_ids)

        context["ti"].xcom_push(key="valid_batch_ids",       value=results["valid"])
        context["ti"].xcom_push(key="quarantined_batch_ids", value=results["quarantined"])
        context["ti"].xcom_push(key="validation_stats",      value=results["stats"])

        print(f"Valid: {len(results['valid'])} | Quarantined: {len(results['quarantined'])}")

    validate_batches = PythonOperator(
        task_id="validate_all_batches",
        python_callable=validate_all_batches,
    )

    # -----------------------------------------------------------------------
    # STAGE 3: Traceability linking
    # -----------------------------------------------------------------------
    def link_traceability(**context):
        """
        For each valid event, assemble the Traceability Code:
          [supplier_id] → [event] → [customer_id]
        Sets prev_event_id and next_event_id foreign keys.
        """
        from processing.linker.traceability_linker import TraceabilityLinker
        valid_ids = context["ti"].xcom_pull(key="valid_batch_ids", task_ids="validate_all_batches")

        linker = TraceabilityLinker()
        linked_count = linker.link_and_generate_codes(valid_ids)
        context["ti"].xcom_push(key="linked_event_count", value=linked_count)
        print(f"Linked {linked_count} traceability events")

    link_events = PythonOperator(
        task_id="link_traceability_events",
        python_callable=link_traceability,
    )

    # -----------------------------------------------------------------------
    # STAGE 4: Event processing — map to canonical event types
    # -----------------------------------------------------------------------
    def process_events(**context):
        """
        Map each linked event to one of:
          - STATE_CHANGE      (e.g., raw → processed → packaged)
          - PROPERTY_CHANGE   (e.g., weight, temperature, grade)
          - OWNERSHIP_CHANGE  (e.g., producer → distributor → retailer)
        Write hydrated events to PostgreSQL hot storage.
        """
        from processing.event_processor.processor import EventProcessor
        linked_count = context["ti"].xcom_pull(key="linked_event_count", task_ids="link_traceability_events")

        processor = EventProcessor()
        written = processor.process_and_write(linked_count)
        print(f"Processed and wrote {written} events to hot storage")

    process_and_write = PythonOperator(
        task_id="process_and_write_events",
        python_callable=process_events,
    )

    # -----------------------------------------------------------------------
    # STAGE 5: Lifecycle — move data ≥12 months old to cold storage
    # -----------------------------------------------------------------------
    def run_lifecycle_policy(**context):
        """
        Move records older than 12 months from PostgreSQL to MinIO Parquet.
        Delete records older than 60 months from cold storage.
        """
        from storage.cold.lifecycle import LifecycleManager
        manager = LifecycleManager()
        moved   = manager.archive_hot_to_cold()
        deleted = manager.purge_expired_cold()
        print(f"Archived: {moved} batches | Purged: {deleted} batches")

    lifecycle = PythonOperator(
        task_id="run_lifecycle_policy",
        python_callable=run_lifecycle_policy,
    )

    # -----------------------------------------------------------------------
    # STAGE 6: Refresh public API read replica
    # -----------------------------------------------------------------------
    refresh_replica = PostgresOperator(
        task_id="refresh_public_api_replica",
        postgres_conn_id="moit_postgres_replica",
        sql="""
            -- Refresh materialized view for consumer-facing Public API
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_public_trace_lookup;
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_qr_code_index;
        """,
    )

    # -----------------------------------------------------------------------
    # STAGE 7: Emit SLA compliance report
    # -----------------------------------------------------------------------
    def emit_sla_report(**context):
        """
        Post batch run summary to monitoring dashboard (Grafana/Prometheus).
        Alerts if any establishment missed the 24-hour SLA.
        """
        from monitoring.sla_reporter import SLAReporter
        reporter = SLAReporter(execution_date=context["ds"])
        reporter.report_and_alert()

    sla_report = PythonOperator(
        task_id="emit_sla_compliance_report",
        python_callable=emit_sla_report,
        trigger_rule=TriggerRule.ALL_DONE,  # always run, even on partial failure
    )

    end = EmptyOperator(task_id="end", trigger_rule=TriggerRule.ALL_DONE)

    # -----------------------------------------------------------------------
    # DAG wiring
    # -----------------------------------------------------------------------
    start >> [collect_sftp, collect_api] >> validate_batches
    validate_batches >> link_events >> process_and_write
    process_and_write >> [lifecycle, refresh_replica]
    [lifecycle, refresh_replica] >> sla_report >> end
