# Manual Edit: AddModal Upload Section

## Location
File: `app/ketidakhadiran/components/AddModal.tsx`
Lines: 348-385

## Current Code (Replace This):
```tsx
{/* File Upload */}
<div className="form-group">
    <label>Upload Dokumen Pendukung (Opsional)</label>
    <div className="upload-container">
        <input
            type="file"
            id="file-upload"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,application/pdf"
            disabled={uploading}
        />
        <label htmlFor="file-upload" className={`upload-box ${uploading ? 'uploading' : ''}`}>
            {uploading ? (
                <div className="spinner-sm"></div>
            ) : uploadedFileUrl ? (
                <div className="uploaded-info">
                    <i className="bi bi-file-earmark-check-fill"></i>
                    <span>File siap disimpan</span>
                </div>
            ) : (
                <div className="upload-placeholder">
                    <i className="bi bi-cloud-arrow-up"></i>
                    <span>Klik untuk pilih PDF atau Gambar</span>
                </div>
            )}
        </label>
        {uploadedFileUrl && (
            <button className="remove-file" onClick={() => {
                setUploadedFileUrl('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            }}>
                <i className="bi bi-trash"></i> Hapus
            </button>
        )}
    </div>
</div>
```

## New Code (Replace With This):
```tsx
{/* File Upload */}
<div className="form-group">
    <label>Upload Dokumen Pendukung (Opsional)</label>
    <input
        type="file"
        id="file-upload"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,application/pdf"
        disabled={uploading}
    />
    
    <label 
        htmlFor="file-upload" 
        className={`upload-box ${uploading ? 'uploading' : ''} ${uploadedFileUrl ? 'success' : ''}`}
    >
        {uploading ? (
            <div className="upload-progress">
                <div className="progress-header">
                    <i className="bi bi-cloud-arrow-up"></i>
                    <span className="progress-filename">{uploadedFileName}</span>
                </div>
                <div className="progress-bar-wrapper">
                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <div className="progress-percent">{uploadProgress}%</div>
            </div>
        ) : uploadedFileUrl ? (
            <div className="uploaded-success">
                <i className="bi bi-check-circle-fill"></i>
                <div className="uploaded-text">
                    <span className="success-label">Upload berhasil</span>
                    <span className="success-filename">{uploadedFileName}</span>
                </div>
                <button 
                    type="button"
                    className="remove-file" 
                    onClick={(e) => {
                        e.preventDefault();
                        setUploadedFileUrl('');
                        setUploadedFileName('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                >
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>
        ) : (
            <div className="upload-placeholder">
                <i className="bi bi-cloud-arrow-up"></i>
                <div className="upload-text-wrapper">
                    <span className="upload-main-text">Klik untuk upload file</span>
                    <span className="upload-sub-text">PDF atau Gambar (Max 10MB)</span>
                </div>
            </div>
        )}
    </label>
</div>
```

## Key Changes:

1. **Removed `upload-container` div** - Not needed anymore
2. **Added success class** to upload-box when file uploaded
3. **Upload Progress** - Shows filename, progress bar with fill animation, and percentage
4. **Success State** - Shows checkmark, filename, inline remove button
5. **Empty State** - Shows upload icon with 2-line text (main + subtitle)

## What's Already Done:
✅ State variables added (uploadProgress, uploadedFileName)
✅ XMLHttpRequest handler with progress tracking
✅ CSS styles for all 3 states
✅ Modal made more compact

##What You Need to Do:
1. Open `AddModal.tsx` in VS Code
2. Find lines 348-385 (the upload section)
3. Select and delete the old code
4. Paste the new code
5. Save file
6. Test upload to see progress bar!
