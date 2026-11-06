# Ahamove AWB – Phiếu lưu kho (Chrome extension)

Tạo AWB khổ **A6 (105 × 148 mm)** có **QR + barcode Code128** của tracking number từ pop-up chi tiết đơn trên
[Ahamove Warehouse](https://app.ahamove.com/v1/warehouse), để nhân viên kho in và dán lên hàng.

## Cài đặt (1 lần)

Hướng dẫn có hình minh hoạ: tải [`huong-dan-su-dung.html`](huong-dan-su-dung.html) về rồi mở bằng trình duyệt.

1. Tải `ahamove-awb-extension.zip` ở trang [Releases](../../releases/latest) (hoặc `git clone` repo này), giải nén ra một thư mục cố định. Đừng xoá thư mục này sau khi cài.
2. Mở Chrome → gõ `chrome://extensions` → bật **Developer mode** (góc phải trên).
3. Bấm **Load unpacked** → chọn thư mục vừa giải nén.
4. Bấm icon ghim (🧩 → 📌) để icon Ahamove hiện trên thanh công cụ.

## Cách dùng

1. Vào https://app.ahamove.com/v1/warehouse → chọn **Lấy hàng thất bại**.
2. Bấm vào một mã đơn để mở pop-up chi tiết.
3. Bấm icon **Ahamove AWB** trên thanh công cụ → cửa sổ AWB hiện ngay trên trang, đè lên pop-up đơn (không mở tab mới).
4. Bấm **In / Lưu PDF (A6)** → hộp thoại in của Chrome:
   - Destination: máy in của kho, hoặc **Save as PDF** (tên file mặc định `AWB_<tracking>.pdf`).
   - Khổ giấy A6, lề *None*, tỉ lệ 100%.
5. Bấm **Đóng**, nhấn `Esc` hoặc bấm ra vùng tối để quay lại pop-up đơn.

## Nội dung AWB

| Phần | Nguồn | Ghi chú |
| --- | --- | --- |
| QR + barcode + chữ lớn | Tracking number của đơn (vd. `DEMO1234`) | Barcode Code128, QR mức sửa lỗi M |
| Người gửi / Người nhận | Thẻ "Lấy hàng" / "Giao hàng" | Che bớt: tên giữ chữ đầu (`Nguyễn V*** A***`), SĐT giữ 3 số đầu + 3 số cuối, địa chỉ ẩn số nhà và bỏ đoạn lặp |
| Hàng hoá | Khối lượng, kích thước, KL đóng gói, danh sách `Nx [Ngành hàng] Tên` | Nhiều món thì chữ tự nhỏ tới 6pt; vẫn không đủ thì gộp phần cuối thành "+N loại khác — xem trên app" |
| Ghi chú kho | Ô trống | Để ghi tay |

## Cách extension lấy dữ liệu

- Chỉ chạy khi bạn bấm icon (quyền `activeTab`), không chạy nền, không gửi dữ liệu ra ngoài.
- Đọc dữ liệu từ component Vue của pop-up (`NewPackageDetail`); nếu không đọc được thì đọc chữ hiển thị trên pop-up.
- Dữ liệu đơn được truyền thẳng vào cửa sổ AWB, không lưu lại ở đâu.

## Cấu trúc

```
manifest.json      MV3, quyền: activeTab, scripting
background.js      Bấm icon → đọc pop-up → hiện awb.html trong overlay trên trang
extract.js         Hàm đọc dữ liệu đơn trong trang warehouse
awb.html/.css/.js  Trang AWB: render, in / lưu PDF
lib/               qrcode-generator 1.4.4, JsBarcode 3.11.6 (MIT)
assets/            Logo chữ A đen trắng
sample/            Mẫu AWB tĩnh để xem trước
```

## Lỗi thường gặp

- **"hãy bấm vào một mã đơn để mở pop-up chi tiết"**: chưa mở pop-up, hoặc pop-up đã đóng.
- **Icon hiện dấu `!`**: tab hiện tại không phải trang Ahamove.
- **In ra bị thu nhỏ / lệch**: trong hộp thoại in đặt *Margins: None*, *Scale: 100*, khổ A6.
