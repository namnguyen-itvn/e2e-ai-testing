# Hướng Dẫn Sử Dụng Postman — Warehouse API

Tài liệu này hướng dẫn QA Manual import và sử dụng Postman collection để test toàn bộ API của hệ thống Warehouse Management System.

---

## Mục Lục

1. [Yêu Cầu](#yêu-cầu)
2. [Import Collection và Environment](#import-collection-và-environment)
3. [Cấu Hình Environment](#cấu-hình-environment)
4. [Luồng Test Cơ Bản (Happy Path)](#luồng-test-cơ-bản-happy-path)
5. [Tổng Quan Các Request](#tổng-quan-các-request)
6. [Chạy Toàn Bộ Collection (Collection Runner)](#chạy-toàn-bộ-collection-collection-runner)
7. [Automated Tests trong Collection](#automated-tests-trong-collection)
8. [Xử Lý Lỗi Thường Gặp](#xử-lý-lỗi-thường-gặp)

---

## Yêu Cầu

| Yêu cầu | Chi tiết |
|---------|----------|
| **Postman** | ≥ v10 — tải tại https://www.postman.com/downloads |
| **Backend đang chạy** | `npm run start:dev` từ thư mục `warehouse-system/backend/` |
| **Database** | PostgreSQL đang chạy và đã cấu hình `.env` |

> ⚠️ Đảm bảo server đang chạy trên `http://localhost:3000` trước khi test.  
> Kiểm tra nhanh: mở browser vào `http://localhost:3000/api/docs` — nếu thấy Swagger UI là OK.

---

## Import Collection và Environment

### Bước 1 — Mở Postman

Mở ứng dụng Postman Desktop (hoặc Postman Web).

### Bước 2 — Import Collection

1. Click nút **Import** (góc trên bên trái)
2. Chọn tab **File**
3. Click **Upload Files**
4. Chọn file: `postman/warehouse-api.postman_collection.json`
5. Click **Import**

Sau khi import, bạn sẽ thấy collection **"Warehouse Management System API"** xuất hiện trong sidebar trái.

### Bước 3 — Import Environment

1. Click **Import** lần nữa
2. Chọn file: `postman/warehouse-api.postman_environment.json`
3. Click **Import**

### Bước 4 — Chọn Environment

1. Góc trên bên phải Postman, click vào dropdown **"No Environment"**
2. Chọn **"Warehouse API — Local"**

> ✅ Sau khi chọn đúng environment, các biến `{{baseUrl}}`, `{{accessToken}}`, `{{productId}}`, `{{orderId}}` sẽ được resolve tự động.

---

## Cấu Hình Environment

Các biến môi trường trong collection:

| Biến | Mô tả | Cập nhật bởi |
|------|-------|--------------|
| `baseUrl` | URL gốc của API | Thủ công (mặc định: `http://localhost:3000/api`) |
| `accessToken` | JWT token sau khi login | **Tự động** — script trong request Login |
| `productId` | UUID của product vừa tạo | **Tự động** — script trong request Create Product |
| `orderId` | UUID của order vừa tạo | **Tự động** — script trong request Create Order |

> 💡 **Lưu ý:** `accessToken` được lưu tự động khi chạy request **Login**. Bạn **không cần** copy-paste token thủ công.

Nếu muốn test với server khác (staging, production):
1. Click vào environment **"Warehouse API — Local"** → Edit
2. Đổi `baseUrl` thành địa chỉ server tương ứng

---

## Luồng Test Cơ Bản (Happy Path)

Chạy các request **theo đúng thứ tự** này để đảm bảo các biến được lưu đúng:

```
1. Auth / Register               → Tạo tài khoản QA Tester
2. Auth / Login                  → Đăng nhập, lưu {{accessToken}}
3. Auth / Get Profile            → Xác nhận token hoạt động
4. Products / Create Product     → Tạo sản phẩm, lưu {{productId}}
5. Products / List Products      → Xem danh sách
6. Products / Get Product by ID  → Xem chi tiết sản phẩm
7. Products / Update Product     → Cập nhật thông tin
8. Inventory / Stock In          → Nhập 100 đơn vị vào kho
9. Inventory / Get Stock by Product → Xác nhận số lượng tồn kho
10. Orders / Create Sales Order  → Tạo đơn bán hàng, lưu {{orderId}}
11. Orders / Get Order by ID     → Xem chi tiết đơn hàng
12. Orders / Confirm Order       → Xác nhận đơn (trừ tồn kho)
13. Orders / Fulfill Order       → Hoàn thành giao hàng
14. Inventory / Get Stock by Product → Kiểm tra tồn kho sau khi bán
15. Audit / Get Audit Logs       → Xem lịch sử thay đổi
```

---

## Tổng Quan Các Request

### 🔐 Auth (4 requests)

| Request | Method | Endpoint | Expected Status |
|---------|--------|----------|:-:|
| Register | POST | `/auth/register` | 201 |
| Login | POST | `/auth/login` | 200 |
| Login - Invalid Credentials | POST | `/auth/login` | 401 |
| Get Profile | GET | `/auth/profile` | 200 |

**Body mẫu — Register:**
```json
{
  "email": "qa-tester@warehouse.com",
  "firstName": "QA",
  "lastName": "Tester",
  "password": "Test@1234"
}
```

**Body mẫu — Login:**
```json
{
  "email": "qa-tester@warehouse.com",
  "password": "Test@1234"
}
```

**Response mẫu — Login thành công:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "qa-tester@warehouse.com",
    "firstName": "QA",
    "lastName": "Tester",
    "role": "user"
  }
}
```

---

### 📦 Products (6 requests)

| Request | Method | Endpoint | Expected Status |
|---------|--------|----------|:-:|
| Create Product | POST | `/products` | 201 |
| List Products | GET | `/products?page=1&limit=10` | 200 |
| Get Product by ID | GET | `/products/{{productId}}` | 200 |
| Get Product by SKU | GET | `/products/sku/WH-PROD-001` | 200 |
| Update Product | PATCH | `/products/{{productId}}` | 200 |
| Delete Product | DELETE | `/products/{{productId}}` | 200 |
| Create Product - Duplicate SKU | POST | `/products` | 409 |

**Body mẫu — Create Product:**
```json
{
  "sku": "WH-PROD-001",
  "name": "Sample Product",
  "description": "Mô tả sản phẩm",
  "category": "Electronics",
  "price": 99.99,
  "quantity": 0,
  "unit": "pcs"
}
```

**Response mẫu — Create Product:**
```json
{
  "id": "c993a06a-7ce1-4e44-a12c-5e2a008905f5",
  "sku": "WH-PROD-001",
  "name": "Sample Product",
  "price": "99.99",
  "quantity": 0,
  "unit": "pcs",
  "status": "active",
  "createdAt": "2026-05-14T07:00:00.000Z"
}
```

---

### 🏭 Inventory (8 requests)

| Request | Method | Endpoint | Expected Status |
|---------|--------|----------|:-:|
| Stock In | POST | `/inventory/stock-in` | 201 |
| Stock Out | POST | `/inventory/stock-out` | 201 |
| Stock Out - Insufficient | POST | `/inventory/stock-out` | 400 |
| Adjust Stock | POST | `/inventory/adjust` | 201 |
| Get Stock by Product | GET | `/inventory/stocks/{{productId}}` | 200 |
| List All Stocks | GET | `/inventory/stocks` | 200 |
| Get Low Stock Items | GET | `/inventory/stocks/low-stock` | 200 |
| Get Transaction History | GET | `/inventory/history/{{productId}}` | 200 |

**Body mẫu — Stock In:**
```json
{
  "productId": "{{productId}}",
  "quantity": 100,
  "note": "Nhập kho lần đầu"
}
```

**Response mẫu — Get Stock by Product:**
```json
{
  "id": "uuid",
  "productId": "{{productId}}",
  "currentQuantity": 100,
  "minQuantity": 10,
  "updatedAt": "2026-05-14T07:00:00.000Z"
}
```

> ⚠️ **Quan trọng:** Field tồn kho là `currentQuantity` (không phải `quantity`).

---

### 📋 Orders (8 requests)

| Request | Method | Endpoint | Expected Status |
|---------|--------|----------|:-:|
| List Orders | GET | `/orders?page=1&limit=10` | 200 |
| Create Sales Order | POST | `/orders` | 201 |
| Create Purchase Order | POST | `/orders` | 201 |
| Get Order by ID | GET | `/orders/{{orderId}}` | 200 |
| Confirm Order | POST | `/orders/{{orderId}}/confirm` | 200 |
| Fulfill Order | POST | `/orders/{{orderId}}/fulfill` | 200 |
| Cancel Order | POST | `/orders/{{orderId}}/cancel` | 200 |
| Confirm Already-Confirmed (expect 400) | POST | `/orders/{{orderId}}/confirm` | 400 |

**Body mẫu — Create Sales Order:**
```json
{
  "type": "sales",
  "items": [
    {
      "productId": "{{productId}}",
      "quantity": 5
    }
  ],
  "partnerName": "Acme Corp",
  "notes": "Urgent delivery"
}
```

**Luồng trạng thái đơn hàng:**
```
pending → [confirm] → confirmed → [fulfill] → fulfilled
pending → [cancel]  → cancelled
confirmed → [cancel] → cancelled  (stock được hoàn lại)
```

**Response mẫu — Create Order:**
```json
{
  "id": "uuid",
  "orderNumber": "SO-2026-0001",
  "type": "sales",
  "status": "pending",
  "totalAmount": "499.95",
  "items": [
    {
      "productId": "uuid",
      "quantity": 5,
      "unitPrice": "99.99",
      "lineTotal": "499.95"
    }
  ],
  "createdAt": "2026-05-14T07:00:00.000Z"
}
```

---

### 📊 Audit (3 requests)

> ⚠️ Audit endpoints yêu cầu role **ADMIN** hoặc **AUDITOR**. User thường sẽ nhận `403 Forbidden`.

| Request | Method | Endpoint | Expected Status |
|---------|--------|----------|:-:|
| Get Audit Logs | GET | `/audit/logs` | 200 |
| Get Audit Logs - Filter by Entity | GET | `/audit/logs?entityName=orders` | 200 |
| Get Entity Audit History | GET | `/audit/logs/orders/{{orderId}}` | 200 |

---

## Chạy Toàn Bộ Collection (Collection Runner)

Collection Runner cho phép chạy tất cả request theo thứ tự và xem kết quả tự động.

### Cách chạy

1. Click chuột phải vào collection **"Warehouse Management System API"**
2. Chọn **"Run collection"**
3. Trong cửa sổ **Collection Runner**:
   - **Environment:** chọn "Warehouse API — Local"
   - **Delay:** đặt `300` ms (giữa các request)
   - **Save responses:** bật để xem chi tiết response
4. Click nút **"Run Warehouse Management System API"**

### Đọc kết quả

- ✅ **PASS** — request thành công, tất cả assertions đều đúng
- ❌ **FAIL** — status code sai hoặc assertion thất bại
- Xem chi tiết lỗi bằng cách click vào tên request bị fail

### Xuất kết quả báo cáo

Sau khi chạy xong:
1. Click **"Export Results"**
2. Chọn định dạng **JSON** hoặc **HTML**
3. Gửi file báo cáo cho team

---

## Automated Tests trong Collection

Mỗi request đã có sẵn **test script** trong tab **Tests**. Các script này tự động kiểm tra:

- ✅ HTTP status code đúng
- ✅ Response body có các field cần thiết
- ✅ Lưu giá trị ID vào collection variables để dùng ở request tiếp theo

**Ví dụ test script trong request Login:**
```javascript
pm.test('Status 200 OK', () => pm.response.to.have.status(200));
pm.test('Has accessToken', () => {
  const body = pm.response.json();
  pm.expect(body).to.have.property('accessToken');
  pm.collectionVariables.set('accessToken', body.accessToken);
});
```

Bạn có thể thêm test case của mình vào tab **Tests** của bất kỳ request nào.

---

## Xử Lý Lỗi Thường Gặp

### `Could not get any response` / `ECONNREFUSED`
**Nguyên nhân:** Server chưa chạy.  
**Cách fix:** Chạy `npm run start:dev` trong thư mục `warehouse-system/backend/`

### `401 Unauthorized`
**Nguyên nhân:** Token hết hạn hoặc chưa login.  
**Cách fix:** Chạy lại request **Auth / Login** để lấy token mới. Token được lưu vào `{{accessToken}}` tự động.

### `403 Forbidden`
**Nguyên nhân:** Tài khoản không có quyền (ví dụ: user thường gọi Audit API).  
**Cách fix:** Đăng ký tài khoản với role `admin`: thêm `"role": "admin"` vào body Register.

### `404 Not Found` trên `/products/{{productId}}`
**Nguyên nhân:** Biến `productId` chưa được lưu.  
**Cách fix:** Chạy request **Products / Create Product** trước.

### `400 Bad Request` khi tạo order
**Nguyên nhân:** `productId` không tồn tại, hoặc sản phẩm chưa có tồn kho.  
**Cách fix:** 
1. Tạo product → lưu `productId`
2. Chạy **Inventory / Stock In** để nhập hàng
3. Tạo order

### `409 Conflict` khi Register
**Nguyên nhân:** Email đã tồn tại trong database.  
**Cách fix:** Dùng email khác, hoặc dùng request **Login** thay vì Register.

### Biến `{{productId}}` hiện `undefined` trong URL
**Nguyên nhân:** Chưa chọn đúng environment.  
**Cách fix:** Góc trên phải Postman → chọn dropdown → **"Warehouse API — Local"**
