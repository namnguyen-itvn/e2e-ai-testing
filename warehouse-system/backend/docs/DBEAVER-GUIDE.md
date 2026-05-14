# Hướng Dẫn Kết Nối Database Bằng DBeaver

Tài liệu này hướng dẫn cấu hình DBeaver để kết nối vào PostgreSQL database của hệ thống Warehouse Management System.

---

## Mục Lục

1. [Cài Đặt DBeaver](#cài-đặt-dbeaver)
2. [Tạo Kết Nối PostgreSQL](#tạo-kết-nối-postgresql)
3. [Thông Tin Kết Nối](#thông-tin-kết-nối)
4. [Kiểm Tra Kết Nối Thành Công](#kiểm-tra-kết-nối-thành-công)
5. [Khám Phá Schema và Bảng Dữ Liệu](#khám-phá-schema-và-bảng-dữ-liệu)
6. [Các Query Hữu Ích Cho QA](#các-query-hữu-ích-cho-qa)
7. [Tips & Tricks DBeaver](#tips--tricks-dbeaver)
8. [Xử Lý Lỗi Kết Nối](#xử-lý-lỗi-kết-nối)

---

## Cài Đặt DBeaver

### Download

| Hệ điều hành | Link |
|---|---|
| macOS | https://dbeaver.io/download/ → **macOS dmg** |
| Windows | https://dbeaver.io/download/ → **Windows installer** |
| Linux | https://dbeaver.io/download/ → **Linux installer** |

Dùng **DBeaver Community Edition** (miễn phí) — đủ dùng cho mọi tác vụ QA.

### Cài đặt trên macOS

```bash
# Cài qua Homebrew
brew install --cask dbeaver-community
```

Hoặc tải file `.dmg` từ website, mở ra và kéo DBeaver vào thư mục Applications.

---

## Tạo Kết Nối PostgreSQL

### Bước 1 — Mở New Connection Wizard

Có 3 cách:
- Menu: **Database → New Database Connection**
- Phím tắt: `Ctrl+N` (Windows/Linux) hoặc `⌘N` (macOS)
- Click icon **plug có dấu cộng** ở góc trên sidebar Database Navigator

### Bước 2 — Chọn PostgreSQL

1. Trong cửa sổ **Connect to a database**
2. Tìm kiếm gõ `postgres`
3. Chọn **PostgreSQL**
4. Click **Next**

> 💡 Lần đầu dùng, DBeaver sẽ hỏi download driver PostgreSQL → Click **Download** và chờ xong.

### Bước 3 — Điền Thông Tin Kết Nối

Tab **Main:**

| Trường | Giá trị |
|--------|---------|
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `warehouse_db` |
| **Username** | `warehouse_user` |
| **Password** | `warehouse_pass` |

> 📌 Đây là giá trị mặc định trong file `.env.example`. Nếu team bạn dùng giá trị khác, lấy từ file `.env` trong thư mục `warehouse-system/backend/`.

### Bước 4 — Test Connection

1. Click nút **Test Connection** (ở góc dưới bên trái của dialog)
2. Nếu thấy thông báo **"Connected"** → thành công ✅
3. Click **Finish** để lưu kết nối

### Bước 5 — Đặt Tên Kết Nối (Tùy Chọn)

Trong tab **General** (hoặc **Connection name**):
- Đặt tên dễ nhớ, ví dụ: `Warehouse Local Dev`

---

## Thông Tin Kết Nối

### Local Development

```
Host:     localhost
Port:     5432
Database: warehouse_db
Username: warehouse_user
Password: warehouse_pass
```

### Lấy giá trị từ file .env

Nếu team có `.env` riêng, mở file `warehouse-system/backend/.env` và dùng các giá trị sau:

```
DB_HOST     → Host
DB_PORT     → Port  
DB_NAME     → Database
DB_USERNAME → Username
DB_PASSWORD → Password
```

---

## Kiểm Tra Kết Nối Thành Công

Sau khi kết nối, bạn sẽ thấy trong **Database Navigator** (sidebar trái):

```
📁 Warehouse Local Dev
  └─ 📁 Databases
       └─ 📁 warehouse_db
            └─ 📁 Schemas
                 └─ 📁 public
                      └─ 📁 Tables
                           ├─ 📋 audit_logs
                           ├─ 📋 inventory_stocks
                           ├─ 📋 inventory_transactions
                           ├─ 📋 order_items
                           ├─ 📋 orders
                           ├─ 📋 products
                           └─ 📋 users
```

> Nếu **Tables** trống, có thể server chưa chạy lần nào (TypeORM chưa sync schema).  
> Chạy `npm run start:dev` một lần để tạo bảng.

---

## Khám Phá Schema và Bảng Dữ Liệu

### Xem dữ liệu trong bảng

1. Trong Database Navigator, mở **warehouse_db → Schemas → public → Tables**
2. Double-click vào tên bảng (ví dụ: `products`)
3. Tab **Data** sẽ hiện toàn bộ dữ liệu dạng bảng
4. Tab **Properties** sẽ hiện cấu trúc cột (tên cột, kiểu dữ liệu, constraint)

### Xem cấu trúc bảng (DDL)

1. Click chuột phải vào tên bảng
2. Chọn **View DDL** → xem lệnh `CREATE TABLE` đầy đủ

### Mô tả các bảng chính

| Bảng | Mô tả | Cột quan trọng |
|------|-------|----------------|
| `users` | Tài khoản người dùng | `email`, `role`, `password_hash` |
| `products` | Danh mục sản phẩm | `sku`, `name`, `price`, `status`, `deleted_at` |
| `inventory_stocks` | Tồn kho hiện tại | `product_id`, `current_quantity`, `min_quantity` |
| `inventory_transactions` | Lịch sử nhập/xuất kho | `transaction_type` (`in`/`out`/`adjust`), `quantity`, `reference` |
| `orders` | Đơn hàng | `order_number`, `type` (`sales`/`purchase`), `status`, `total_amount` |
| `order_items` | Dòng hàng của đơn | `order_id`, `product_id`, `quantity`, `unit_price`, `line_total` |
| `audit_logs` | Lịch sử mọi thay đổi | `action`, `entity_name`, `entity_id`, `new_value`, `performed_by` |

---

## Các Query Hữu Ích Cho QA

Mở SQL Editor: **Menu → SQL Editor → New SQL Script** hoặc phím `F3`.

### 1. Xem tất cả sản phẩm đang active

```sql
SELECT
    id,
    sku,
    name,
    price,
    status,
    created_at
FROM products
WHERE deleted_at IS NULL
ORDER BY created_at DESC;
```

### 2. Xem tồn kho của tất cả sản phẩm

```sql
SELECT
    p.sku,
    p.name,
    s.current_quantity,
    s.min_quantity,
    CASE
        WHEN s.current_quantity <= s.min_quantity THEN '⚠️ Low Stock'
        WHEN s.current_quantity = 0               THEN '❌ Out of Stock'
        ELSE '✅ OK'
    END AS stock_status
FROM inventory_stocks s
JOIN products p ON p.id = s.product_id
WHERE p.deleted_at IS NULL
ORDER BY s.current_quantity ASC;
```

### 3. Xem tất cả đơn hàng và trạng thái

```sql
SELECT
    order_number,
    type,
    status,
    partner_name,
    total_amount,
    created_at,
    confirmed_at,
    fulfilled_at,
    cancelled_at
FROM orders
ORDER BY created_at DESC
LIMIT 50;
```

### 4. Xem chi tiết 1 đơn hàng (kèm sản phẩm)

```sql
SELECT
    o.order_number,
    o.status,
    p.sku,
    p.name AS product_name,
    oi.quantity,
    oi.unit_price,
    oi.line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p    ON p.id = oi.product_id
WHERE o.order_number = 'SO-2026-0001';  -- ← đổi order number ở đây
```

### 5. Xem lịch sử giao dịch kho của 1 sản phẩm

```sql
SELECT
    t.transaction_type,
    t.quantity,
    t.quantity_before,
    t.quantity_after,
    t.reference,
    t.note,
    t.created_at
FROM inventory_transactions t
JOIN products p ON p.id = t.product_id
WHERE p.sku = 'WH-PROD-001'  -- ← đổi SKU ở đây
ORDER BY t.created_at DESC;
```

### 6. Kiểm tra tồn kho không âm sau stress test

```sql
SELECT
    p.sku,
    p.name,
    s.current_quantity
FROM inventory_stocks s
JOIN products p ON p.id = s.product_id
WHERE s.current_quantity < 0;
-- Kết quả phải trống (0 rows) — tồn kho không bao giờ được âm
```

### 7. Xem audit log của 1 entity

```sql
SELECT
    action,
    entity_name,
    entity_id,
    old_value,
    new_value,
    performed_by,
    created_at
FROM audit_logs
WHERE entity_name = 'orders'
  AND entity_id = 'uuid-của-order'  -- ← đổi UUID ở đây
ORDER BY created_at ASC;
```

### 8. Thống kê đơn hàng theo trạng thái

```sql
SELECT
    status,
    type,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_value
FROM orders
GROUP BY status, type
ORDER BY status, type;
```

### 9. Tìm user theo email

```sql
SELECT
    id,
    email,
    first_name,
    last_name,
    role,
    created_at
FROM users
WHERE email ILIKE '%qa%';
```

### 10. Xóa dữ liệu test (dùng sau mỗi test run)

```sql
-- ⚠️ CHỈ chạy trên môi trường DEV/TEST — KHÔNG chạy trên Production!

BEGIN;

DELETE FROM audit_logs;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM inventory_transactions;
DELETE FROM inventory_stocks;
DELETE FROM products;
DELETE FROM users WHERE email NOT LIKE '%admin%';

COMMIT;
```

---

## Tips & Tricks DBeaver

### Lưu SQL Script

- Nhấn `Ctrl+S` (`⌘S` macOS) trong SQL Editor để lưu script
- Đặt tên file mô tả, ví dụ: `check-inventory-stock.sql`

### Format SQL tự động

- Nhấn `Ctrl+Shift+F` (`⌘⇧F` macOS) để format đẹp lại SQL

### Auto-complete

- Gõ tên bảng/cột rồi nhấn `Ctrl+Space` để xem gợi ý
- Ví dụ: gõ `SELECT * FROM pro` → `Ctrl+Space` → gợi ý `products`

### Xem dữ liệu dạng JSON

- Với cột `new_value`, `old_value` trong `audit_logs` (kiểu `jsonb`)
- Click vào cell → DBeaver tự hiển thị dạng JSON đẹp

### Filter dữ liệu nhanh trong bảng

- Khi đang xem dữ liệu bảng (tab Data)
- Click vào tiêu đề cột → chọn **Order Ascending/Descending**
- Click icon phễu (filter) để filter theo điều kiện

### Bookmark kết nối hay dùng

- Click chuột phải vào connection → **Connect** để kết nối lại nhanh
- DBeaver nhớ password nên không cần nhập lại

### Xem Explain Plan

- Viết query trong SQL Editor
- Nhấn `Ctrl+Shift+E` (`⌘⇧E` macOS) để xem execution plan
- Hữu ích để kiểm tra performance query

---

## Xử Lý Lỗi Kết Nối

### `Connection refused` / `Could not connect`

**Nguyên nhân:** PostgreSQL không chạy.

```bash
# macOS
brew services start postgresql@14
brew services list  # kiểm tra status

# Linux
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### `FATAL: database "warehouse_db" does not exist`

**Nguyên nhân:** Database chưa được tạo.

```bash
psql -U postgres -c "CREATE DATABASE warehouse_db;"
```

### `FATAL: password authentication failed for user "warehouse_user"`

**Nguyên nhân:** Sai mật khẩu hoặc user chưa tồn tại.

```bash
# Tạo user và gán quyền
psql -U postgres -c "CREATE USER warehouse_user WITH PASSWORD 'warehouse_pass';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE warehouse_db TO warehouse_user;"
```

### `Driver class ... not found` / Download driver

**Nguyên nhân:** DBeaver chưa có JDBC driver cho PostgreSQL.

1. Khi gặp lỗi này, DBeaver sẽ tự hỏi **"Download driver?"**
2. Click **Yes/Download** và chờ vài giây
3. Thử kết nối lại

### Bảng không hiện trong Database Navigator

**Nguyên nhân:** TypeORM chưa sync schema (server chưa khởi động lần nào với `DB_SYNCHRONIZE=true`).

```bash
# Khởi động server ít nhất 1 lần để tạo bảng
npm run start:dev
# Chờ thấy "Application is running on: http://localhost:3000"
# Sau đó Refresh trong DBeaver: F5 hoặc chuột phải → Refresh
```

### Dữ liệu không cập nhật sau khi chạy API

**Nguyên nhân:** DBeaver không tự refresh.

- Nhấn **F5** để refresh dữ liệu trong tab Data
- Hoặc click chuột phải vào bảng → **Refresh**
