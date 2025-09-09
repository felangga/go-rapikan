# Go Rapikan

Extension Visual Studio Code untuk merapikan dan mengurutkan import dalam file Go secara otomatis dengan pengelompokan yang rapi.

## 📋 Fitur

- **Format Go**: Menjalankan `go fmt` pada file aktif untuk memastikan kode sesuai standar Go
- **Pengelompokan Import Otomatis**: Mengelompokkan import menjadi beberapa kategori:
  - Standard Library Go (tanpa domain)
  - External packages (dari GitHub atau domain lain)
  - Internal packages (dikelompokkan berdasarkan organisasi dan project)
- **Pengurutan Alfabetis**: Mengurutkan import dalam setiap grup secara alfabetis
- **Pemisahan dengan Baris Kosong**: Memisahkan setiap grup dengan baris kosong untuk kemudahan membaca
- **Deteksi Organisasi Dinamis**: Secara otomatis mendeteksi username/organisasi GitHub dari import dan mengelompokkannya

## 🚀 Cara Penggunaan

1. Buka file Go (`.go`) di VS Code
2. Buka Command Palette (`Cmd+Shift+P` di Mac atau `Ctrl+Shift+P` di Windows/Linux)
3. Ketik dan pilih: `Go Rapikan: Sort Imports`
4. Extension akan otomatis:
   - Menjalankan `go fmt` pada file
   - Mengelompokkan dan mengurutkan import
   - Menyimpan perubahan

## 📦 Contoh Hasil

### Sebelum:
```go
import (
    "github.com/mycompany/backend/user-service/internal/util"
    "github.com/gin-gonic/gin"
    "context"
    "github.com/mycompany/shared/database"
    "errors"
    "database/sql"
    "github.com/mycompany/backend/user-service/internal/models"
)
```

### Sesudah:
```go
import (
    "context"
    "database/sql"
    "errors"

    "github.com/gin-gonic/gin"

    "github.com/mycompany/shared/database"

    "github.com/mycompany/backend/user-service/internal/models"
    "github.com/mycompany/backend/user-service/internal/util"
)
```

## 🛠️ Aturan Pengelompokan

Extension ini menggunakan aturan pengelompokan yang fleksibel:

1. **Standard Library**: Package bawaan Go yang tidak memiliki domain (contoh: `fmt`, `context`, `strings`)
2. **External Packages**: Package dari GitHub atau domain lain yang bukan milik organisasi internal
3. **Internal Packages**: Package dari organisasi yang sama, dikelompokkan berdasarkan project:
   - Dideteksi secara otomatis dari pattern `github.com/{username}/{project}/...`
   - Setiap project (seperti `shared`, `backend`, dll.) mendapat grup terpisah
   - Diurutkan berdasarkan nama project secara alfabetis

## 📋 Persyaratan

- VS Code versi 1.60.0 atau lebih baru
- Go terinstall di sistem dan dapat diakses melalui command line
- File Go yang valid dengan syntax import yang benar

## ⚙️ Instalasi

1. Buka VS Code
2. Tekan `Ctrl+Shift+X` (atau `Cmd+Shift+X` di Mac) untuk membuka Extensions
3. Cari "Go Rapikan"
4. Klik "Install"

Atau install melalui command line:
```bash
code --install-extension go-rapikan
```

## 🔧 Pengembangan

Untuk pengembangan extension ini:

```bash
# Clone repository
git clone <repository-url>
cd go-rapikan

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Test extension
F5 (di VS Code untuk membuka Extension Development Host)
```

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan:

1. Fork repository ini
2. Buat branch untuk fitur baru (`git checkout -b feature/amazing-feature`)
3. Commit perubahan (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## 📄 Lisensi

Extension ini dirilis di bawah lisensi MIT. Lihat file `LICENSE` untuk detail lengkap.

## 🐛 Melaporkan Bug

Jika menemukan bug atau memiliki saran fitur, silakan buat issue di repository GitHub ini dengan informasi:

- Versi VS Code
- Versi Go
- Contoh kode yang bermasalah
- Pesan error (jika ada)
- Langkah reproduksi

## Credits

- Coding icons created by [pocike - Flaticon](https://www.flaticon.com/free-icons/coding)

---