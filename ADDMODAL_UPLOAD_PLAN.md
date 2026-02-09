# AddModal Upload UX Improvements

## Changes Needed:

### 1. **Modal Size Reduction** ✅
- Reduce padding dari 24px → 18px
- Reduce max-width dari 650px → 580px  
- Reduce modal-header padding dari 20px → 16px
- Reduce grid gap dari 24px → 16px
- Reduce form-group margin dari 24px → 18px

### 2. **Upload Progress Implementation** ✅
**State Added:**
- `uploadProgress`: number (0-100%)
- `uploadedFileName`: string

**handleFileUpload Updated:**
- Use XMLHttpRequest instead of fetch
- Track upload progress with xhr.upload.addEventListener('progress')
- Calculate percentage: Math.round((loaded / total) * 100)
- Update uploadProgress state in real-time

### 3. **Professional Upload UI** ✅

**Three States:**

**A. Empty/Default State:**
```tsx
<div className="upload-placeholder">
  <i className="bi bi-cloud-arrow-up"></i>
  <div>
    <p>Klik untuk upload file</p>
    <p>PDF atau Gambar (Max 10MB)</p>
  </div>
</div>
```

**B. Uploading State (with progress):**
```tsx
<div className="upload-progress">
  <i className="bi bi-cloud-upload"></i>
  <span>{uploadedFileName}</span>
  <div className="progress-bar-wrapper">
    <div className="progress-bar-fill" style={{width: `${uploadProgress}%`}}></div>
  </div>
  <div className="progress-percent">{uploadProgress}%</div>
</div>
```

**C. Success State:**
```tsx
<div className="uploaded-success">
  <i className="bi bi-check-circle-fill"></i>
  <div>
    <span>Upload berhasil</span>
    <span>{uploadedFileName}</span>
  </div>
  <button onClick={removeFile}>
    <i className="bi bi-trash"></i>
  </button>
</div>
```

### 4. **CSS Updates Needed:**

```css
/* Compact Modal */
.modal-container { max-width: 580px; }
.modal-header { padding: 16px 20px; }
.modal-body { padding: 18px; }
.grid-2 { gap: 16px; margin-bottom: 18px; }
.form-group { margin-bottom: 18px; }

/* Upload Box */
.upload-box {
  min-height: 100px;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #f8fafc;
}

.upload-box:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-box.uploading {
  cursor: wait;
}

.upload-box.success {
  border-color: #10b981;
  background: #f0fdf4;
}

/* Upload Progress */
.upload-progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3b82f6;
}

.progress-filename {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e40af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-bar-wrapper {
  width: 100%;
  height: 8px;
  background: #e0e7ff;
  border-radius: 99px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  transition: width 0.3s ease;
  border-radius: 99px;
}

.progress-percent {
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e40af;
}

/* Success State */
.uploaded-success {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}

.uploaded-success i {
  font-size: 2rem;
  color: #10b981;
}

.uploaded-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.success-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #059669;
}

.success-filename {
  font-size: 0.75rem;
  color: #64748b;
}

/* Remove Button */
.remove-file {
  padding: 8px 12px;
  background: #fee2e2;
  color: #ef4444;
  border: none;
  border-radius: 8px;
  font-size: 0.813rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.remove-file:hover {
  background: #fecaca;
}
```

## Implementation Steps:

1. ✅ Add uploadProgress and uploadedFileName state
2. ✅ Update handleFileUpload to use XMLHttpRequest
3. ⏳ Update upload JSX with 3 states (empty, uploading, success)
4. ⏳ Update CSS for compact modal + progress bar
5. ⏳ Test upload flow

## Benefits:

✅ **Modal lebih compact** - Menghemat ruang layar
✅ **Progress visible** - User tahu berapa persen sudah terupload
✅ **Professional design** - Smooth progress bar animation
✅ **Better feedback** - Clear visual states (empty → uploading → success)
✅ **File name visible** - User tahu file apa yang diupload
