# 🏛️ Hệ Thống Truy Xuất Nguồn Gốc Quốc Gia — Kiến Trúc Batch
# National Food Traceability Hub — Batch Architecture
**Cơ quan chủ quản / Owner:** Bộ Công Thương (MoIT — Ministry of Industry and Trade)  
**Phiên bản / Version:** 1.0.0  
**Ngày / Date:** 2026-03-09  

---

## 1. Bối Cảnh & Mục Tiêu (Problem Context & Goals)

| Mục tiêu | Chi tiết |
|---|---|
| **Quản lý quốc gia** | Thiết lập hub truy xuất nguồn gốc thực phẩm do Bộ Công Thương quản lý |
| **Ràng buộc cập nhật** | Dữ liệu phải được cập nhật **trong vòng 24 giờ** kể từ khi sự kiện truy xuất xảy ra |
| **Nguyên tắc hệ thống** | Hỗ trợ "**Một bước trước – Một bước sau**" (One step before / One step after) |
| **Triển khai** | Plug-and-Play để phù hợp với mọi cơ sở kinh doanh |
| **Lưu trữ** | Bắt buộc **5 năm (60 tháng)** với sản phẩm không có hạn dùng |

---

## 2. Tổng Quan Kiến Trúc (High-Level Architecture)

Hệ thống hoạt động như một **Validated Data Lake**. Các cơ sở kinh doanh nộp nhật ký hoạt động hàng ngày vào "hộp thư đến" an toàn. Hệ thống trung tâm xử lý chúng theo chu kỳ batch đã được lên lịch.

```
┌─────────────────────────────────────────────────────────────────┐
│                    INGESTION LAYER (Đầu vào)                    │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  SFTP / S3   │  │  Bulk Upload API │  │  Web Portal (UI)  │  │
│  │ (CSV/XML/XLS)│  │  REST Batch      │  │  Manual Entry     │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬──────────┘  │
└─────────┼──────────────────┼──────────────────────┼─────────────┘
          │                  │                      │
          └──────────────────▼──────────────────────┘
                    Raw Event Staging Area
                    ┌─────────────────────┐
                    │   MinIO / S3 Inbox  │
                    └──────────┬──────────┘
                               │  (Apache Airflow triggers daily)
┌──────────────────────────────▼──────────────────────────────────┐
│                   PROCESSING LAYER (Xử lý)                       │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐   │
│  │  Validation Engine  │  │  Traceability Linker             │   │
│  │  (Pydantic/Pandas)  │  │  (one-before ↔ one-after)        │   │
│  │  - Schema check     │  │  - Supplier link                 │   │
│  │  - Mandatory fields │  │  - Customer link                 │   │
│  │  - Lot Number       │  │  - Traceability Code assembly    │   │
│  └─────────────────────┘  └──────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Event Processor                                │  │
│  │  Maps to: State Change | Property Change | Ownership Change │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│               STORAGE & SERVING LAYER (Lưu trữ & Phục vụ)       │
│  ┌────────────────────┐   ┌────────────────────────────────────┐  │
│  │   Hot Storage      │   │   Archive Storage (Cold Lake)      │  │
│  │   PostgreSQL       │   │   MinIO / Cloud Object Storage     │  │
│  │   Last 12 months   │   │   Up to 60 months (5 years)       │  │
│  │   Fast recall      │   │   Non-expiring products            │  │
│  └────────────────────┘   └────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │         Public API / Cổng Thông Tin (Read-Only)             │  │
│  │   QR Scan → Consumer Product Origin Lookup (FREE)          │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Chi Tiết Từng Lớp (Layer Details)

### 3.1 Ingestion Layer — Lớp Thu Thập Dữ Liệu

Thiết kế theo nguyên tắc **Plug-and-Play**: mỗi cơ sở kinh doanh có thể chọn phương thức phù hợp.

| Kênh | Đối tượng | Định dạng | SLA |
|---|---|---|---|
| **SFTP / S3 File Drop** | Doanh nghiệp lớn, ERP cũ | CSV, XML, Excel (.xlsx) | Upload trước 23:00 hàng ngày |
| **Bulk Upload API** | ERP hiện đại, startups | JSON batch (≤500 records/req) | REST POST, idempotent |
| **Web Portal (Manual)** | Cơ sở nhỏ, hộ kinh doanh | Form nhập tay | UI đơn giản, responsive |

**Trường bắt buộc (Mandatory Fields) cho mọi sự kiện:**
- `product_id` — Mã sản phẩm
- `location_id` — Mã địa điểm
- `timestamp` — Thời điểm xảy ra sự kiện (ISO 8601)
- `lot_number` — Số lô hàng

---

### 3.2 Processing Layer — Lớp Xử Lý

Được điều phối bởi **Apache Airflow** theo lịch hàng ngày (mặc định: 00:00 – 06:00).

#### A. Validation Engine
```python
# Ví dụ schema validation với Pydantic
from pydantic import BaseModel
from datetime import datetime

class TraceabilityEvent(BaseModel):
    product_id: str
    location_id: str
    timestamp: datetime
    lot_number: str
    event_type: str  # STATE_CHANGE | PROPERTY_CHANGE | OWNERSHIP_CHANGE
    actor_id: str    # Mã cơ sở (đã xác thực qua OAuth2)
```

#### B. Traceability Linker
Lắp ráp **Mã Truy Xuất (Traceability Code)** theo nguyên tắc:
```
[Mã nhà cung cấp] → [Sự kiện hiện tại] → [Mã khách hàng]
     (one before)                             (one after)
```

#### C. Event Processor
Ánh xạ sự kiện sang 3 loại chính:
1. **State Change** — Thay đổi trạng thái (raw → processed → packaged)
2. **Property Change** — Thay đổi thuộc tính (weight, temperature, grade)
3. **Ownership Change** — Thay đổi quyền sở hữu (producer → distributor → retailer)

---

### 3.3 Storage & Serving Layer — Lớp Lưu Trữ & Phục Vụ

#### Hot Storage (PostgreSQL)
- Dữ liệu **12 tháng gần nhất**
- Tối ưu hóa cho tra cứu nhanh trong thu hồi thực phẩm khẩn cấp
- Index trên `lot_number`, `product_id`, `location_id`

#### Archive Storage (Cold Lake — MinIO/S3)
- Dữ liệu từ **tháng 13 đến tháng 60**
- Lưu dưới dạng Parquet (nén, tiết kiệm chi phí)
- Lifecycle policy tự động chuyển từ Hot sang Cold sau 12 tháng

#### Public API / Cổng Thông Tin
- **Read-only replica** — không ảnh hưởng đến hệ thống ghi
- Endpoint: `GET /trace/{product_id}` và `GET /trace/qr/{qr_code}`
- Rate-limited, miễn phí cho người tiêu dùng cuối

---

## 4. Stack Công Nghệ (Technology Stack)

| Thành phần | Công nghệ | Lý do chọn |
|---|---|---|
| **Orchestration** | Apache Airflow | Lập lịch và giám sát batch jobs từ hàng nghìn nguồn |
| **Data Validation** | Python (Pandas + Pydantic) | Mạnh trong làm sạch & validate CSV/Excel "lộn xộn" |
| **Primary Database** | PostgreSQL | Hỗ trợ audit log và liên kết quan hệ step-by-step |
| **Storage** | MinIO / Cloud Object Storage | Tiết kiệm chi phí cho yêu cầu lưu 5 năm |
| **Security** | OAuth2 + Digital Signatures | Xác thực pháp lý cơ sở nộp batch |
| **API Gateway** | FastAPI / Nginx | Hiệu suất cao, dễ document với OpenAPI |
| **Monitoring** | Grafana + Prometheus | Theo dõi SLA 24 giờ, alert khi batch lỗi |

---

## 5. Luồng Dữ Liệu 24 Giờ (24-Hour Data Flow)

```
06:00 PM  Sự kiện xảy ra tại cơ sở (e.g., lô hàng được đóng gói)
          │
08:00 PM  Cơ sở export CSV / gọi API / nhập web portal
          │
11:59 PM  Deadline nộp dữ liệu (cut-off)
          │
12:00 AM  Airflow DAG khởi động — Validation + Linking + Processing
          │
06:00 AM  Dữ liệu đã qua xử lý sẵn sàng trên Public API
          │
< 24h     ✅ Đảm bảo ràng buộc cập nhật trong 24 giờ
```

---

## 6. Quy Tắc Lưu Trữ (Retention Policy)

```
Month 0                    Month 12              Month 60
    │◄─────── Hot Storage ───────►│◄──── Cold Archive ────►│
    │         (PostgreSQL)        │       (MinIO/S3)        │
    │         Fast queries        │     Parquet + GZIP      │
    │         Safety recall       │     Compliance only     │
                                                            │
                                                        DELETE
                                               (auto lifecycle policy)
```

---

## 7. Mô Hình Dữ Liệu Cốt Lõi (Core Data Model)

```sql
-- Bảng sự kiện truy xuất
CREATE TABLE traceability_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    traceability_code VARCHAR(64) UNIQUE NOT NULL,
    product_id      VARCHAR(50) NOT NULL,
    lot_number      VARCHAR(50) NOT NULL,
    location_id     VARCHAR(50) NOT NULL,
    actor_id        VARCHAR(50) NOT NULL,   -- OAuth2 verified establishment
    event_type      VARCHAR(30) NOT NULL,   -- STATE | PROPERTY | OWNERSHIP
    event_timestamp TIMESTAMPTZ NOT NULL,
    -- One-step-before / one-step-after
    prev_event_id   UUID REFERENCES traceability_events(id),
    next_event_id   UUID REFERENCES traceability_events(id),
    payload         JSONB,                  -- flexible fields per event type
    batch_id        UUID NOT NULL,          -- links to the ingestion batch
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_product_lot (product_id, lot_number),
    INDEX idx_timestamp   (event_timestamp DESC)
);

-- Bảng cơ sở đăng ký
CREATE TABLE establishments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_code   VARCHAR(20) UNIQUE NOT NULL, -- MST / mã cơ sở
    name            VARCHAR(255) NOT NULL,
    oauth_client_id VARCHAR(255) UNIQUE,
    digital_cert    TEXT,                        -- PEM public key
    tier            VARCHAR(10) DEFAULT 'SFTP',  -- SFTP | API | PORTAL
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. Cấu Trúc Thư Mục Dự Án (Project Structure)

```
Traceability_VN/
├── README.md                     # Tài liệu này
├── architecture/
│   ├── batch_architecture.html   # Sơ đồ kiến trúc tương tác
│   └── data_model.drawio         # Mô hình dữ liệu
├── ingestion/
│   ├── sftp_watcher/             # Watch & ingest SFTP drops
│   ├── bulk_api/                 # FastAPI bulk upload endpoint
│   └── web_portal/               # Simple manual entry UI
├── processing/
│   ├── validation/               # Pydantic schemas + Pandas cleaning
│   ├── linker/                   # Traceability code assembly
│   └── event_processor/          # Event type mapping
├── storage/
│   ├── migrations/               # Alembic DB migrations
│   ├── hot/                      # PostgreSQL models
│   └── cold/                     # MinIO lifecycle policies
├── api/
│   └── public/                   # Read-only consumer API
├── orchestration/
│   └── dags/                     # Apache Airflow DAGs
├── security/
│   └── oauth2/                   # OAuth2 + digital signature config
└── monitoring/
    └── dashboards/               # Grafana JSON dashboards
```

---

## 9. Kế Hoạch Triển Khai MVP (MVP Deployment Plan)

| Tuần | Hạng mục |
|---|---|
| **Tuần 1** | Setup PostgreSQL, MinIO, Airflow; implement Validation Engine |
| **Tuần 2** | Bulk Upload API + SFTP watcher; Traceability Linker |
| **Tuần 3** | Web Portal; Public API; OAuth2 integration |
| **Tuần 4** | End-to-end testing; monitoring dashboards; pilot với 3 cơ sở |

---

*Tài liệu được tạo: 2026-03-09 | Phiên bản: 1.0.0 | MoIT Traceability Hub*
