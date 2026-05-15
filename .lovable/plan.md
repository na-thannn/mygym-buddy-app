
# Tích hợp HL Fitness ↔ SharePoint (Microsoft Graph)

Web sẽ đọc/ghi thẳng vào SharePoint qua Microsoft Graph API. Lovable Cloud chỉ giữ auth + bảng `profiles` tối thiểu (để map user) + các bảng xã hội (`posts`, `coach_threads`…). Toàn bộ profile chi tiết, log workout/meal/inbody, plan & analysis sẽ nằm trên SharePoint — đúng nguồn dữ liệu mà agent Copilot Studio đang dùng.

---

## Phần 1 — Bạn cần chuẩn bị bên Microsoft 365 (tôi không làm thay được)

### A. Tạo Azure AD App Registration
1. Vào https://entra.microsoft.com → **Applications → App registrations → New registration**.
2. Name: `HL Fitness Web`. Supported account types: **Single tenant**. Redirect URI: bỏ trống. → **Register**.
3. Ghi lại **Application (client) ID** và **Directory (tenant) ID**.
4. **Certificates & secrets → New client secret** (hạn 24 tháng) → copy **Value** (chỉ hiện 1 lần).
5. **API permissions → Add permission → Microsoft Graph → Application permissions**, thêm:
   - `Sites.Selected` (an toàn nhất, chỉ site bạn cấp) **hoặc** `Sites.ReadWrite.All`
   - `Files.ReadWrite.All`
6. Bấm **Grant admin consent**.
7. Nếu chọn `Sites.Selected`: dùng PowerShell/Graph Explorer cấp quyền `write` cho app trên đúng site SharePoint.

### B. Lấy thông tin SharePoint
- **Site ID**: gọi `GET https://graph.microsoft.com/v1.0/sites/{tenant}.sharepoint.com:/sites/{site-name}` → field `id` (dạng `tenant.sharepoint.com,guid,guid`).
- **List ID** của list Profile.
- **Drive item ID** (hoặc đường dẫn) của file Excel logs và folder chứa file `.md`.

### C. Secrets cần add vào Lovable
Sau khi có đủ, tôi sẽ gọi tool add secret cho:
- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `SP_SITE_ID`
- `SP_PROFILE_LIST_ID`
- `SP_LOGS_DRIVE_ID` + `SP_LOGS_ITEM_ID` (file Excel)
- `SP_PLANS_DRIVE_ID` + `SP_PLANS_FOLDER_PATH`
- (tuỳ chọn) `COPILOT_DIRECTLINE_SECRET` nếu muốn nhúng agent vào trang `/coach`.

---

## Phần 2 — Việc tôi sẽ build trong web

### 1. Lớp Graph client (`src/lib/sharepoint.server.ts`)
- Hàm `getGraphToken()`: client-credentials flow → cache token in-memory theo `expires_in`.
- Helper `graph(path, init)` tự gắn `Authorization: Bearer …`, retry 1 lần khi 401.

### 2. Server functions (`src/lib/sharepoint.functions.ts`)
Mỗi hàm bọc `requireSupabaseAuth` để biết `userId`, rồi map sang khoá SharePoint (email user hoặc cột `LovableUserId` trong List).
- Profile: `getProfile`, `upsertProfile` → SharePoint List items (`/sites/{id}/lists/{id}/items`).
- Workout/Meal/InBody: `appendWorkout`, `appendMeal`, `appendInbody`, `listWorkouts(range)`, `listMeals(range)`, `listInbody()` → Excel `workbook/tables/{name}/rows` (xem skill `microsoft_excel`).
- Plans & Analysis: `listPlans`, `readPlan(name)`, `savePlan(name, md)`, `saveAnalysis(name, md)` → `/drive/items/{id}/children` + `PUT /content` cho `.md`.
- AI sinh plan/analysis: vẫn gọi Lovable AI Gateway như hiện tại, output Markdown rồi `savePlan` lên SharePoint thay vì insert Postgres.

### 3. Map user
Thêm cột text `sharepoint_key` vào `profiles` (mặc định = email từ `auth.users`). Nếu user trên SharePoint List dùng email khác, cho phép chỉnh trong trang Profile.

### 4. Refactor các trang hiện có
- `/profile` → đọc/ghi qua `getProfile/upsertProfile` thay cho Postgres.
- `/inbody`, `/log/workout`, `/log/nutrition`, `/progress` → gọi server fn SharePoint, dùng `useQuery` + `useServerFn`. Bỏ insert vào Postgres tương ứng.
- `/plans` → list từ folder `.md`, click mở viewer markdown (dùng `react-markdown`, đã sẵn ý tưởng). Nút "Tạo plan" gọi AI rồi `savePlan`.
- Coach: thêm tab "Phân tích" gọi `saveAnalysis` so sánh plan ↔ workout thực tế.

### 5. Dọn dẹp DB Lovable
Sau khi UI mới chạy ổn:
- Drop (hoặc giữ archive) các bảng `inbody_entries`, `workout_logs`, `meal_logs`, `workout_plans`.
- Giữ: `profiles` (rút gọn), `user_roles`, `pt_applications`, `pt_presence`, `posts`, `post_likes`, `post_comments`, `coach_threads`, `coach_messages`.
- Storage bucket `inbody/meals/posts` vẫn giữ cho ảnh feed (Excel không tiện chứa ảnh). InBody scan có thể upload thẳng SharePoint qua `PUT /drive/items/.../content`.

### 6. (Tuỳ chọn) Nhúng agent Copilot Studio vào `/coach`
Hai lựa chọn:
- **Web Chat iframe** publish sẵn từ Copilot Studio — nhanh nhất, 5 phút.
- **Direct Line API**: server fn `getDirectLineToken` đổi secret → token, frontend dùng `botframework-webchat`. Cho phép truyền `userId` để agent biết bạn là ai và lấy đúng record SharePoint.

---

## Phần 3 — Rủi ro & lưu ý

- **Throttling Graph**: ~10 req/s/app/site. Gom batch (`/$batch`) khi load dashboard.
- **Excel concurrency**: tạo `workbookSession` `persistChanges:true` cho mỗi request ghi, đóng sau khi xong; tránh 2 user ghi cùng lúc gây lock — dùng retry với jitter.
- **Latency** cao hơn Postgres (200–600ms). UI cần skeleton + optimistic update.
- **Mất Realtime** cho log cá nhân (Graph không có websocket). Nếu cần live, fallback: poll mỗi 15s ở trang đang mở.
- **RLS** không còn cho dữ liệu cá nhân — bảo mật phụ thuộc server fn check `userId` trước khi map sang SharePoint key. Tuyệt đối không expose Graph token ra client.
- **Backup**: SharePoint version history bật sẵn cho file Excel/.md.

---

## Thứ tự triển khai
1. Bạn hoàn tất Phần 1 (Azure app + lấy IDs) → tôi add secrets.
2. Tôi build Graph client + 1 server fn mẫu (`getProfile`) + test bằng `invoke-server-function`.
3. Refactor lần lượt: Profile → InBody → Workout → Meal → Progress → Plans → Analysis.
4. Nhúng Copilot Studio vào `/coach` (nếu muốn).
5. Drop bảng cũ trong Postgres.

Khi bạn xong Phần 1, gửi lại 8 giá trị secret ở mục C — tôi sẽ kích hoạt form add-secret an toàn, không cần dán trong chat.
