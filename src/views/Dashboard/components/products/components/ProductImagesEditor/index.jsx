import { useEffect, useRef } from 'react'
import { productImage } from '@/lib/productImage'
import './styles.css'

function FilePreview({ file }) {
  const ref = useRef(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    ref.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <img ref={ref} alt={file.name} />
}

export default function ProductImagesEditor({ retained, files, onRetained, onFiles, onError }) {
  const count = retained.length + files.length
  return <div className="product-images-editor pf-full">
    <strong>Imágenes ({count}/3)</strong>
    <p>La primera es la portada. PNG, JPG, WEBP o GIF, hasta 5 MB cada una.</p>
    <div className="product-images-list">
      {retained.map((url, index) => <div key={url}>
        <img src={productImage(url)} alt={`Imagen ${index + 1}`} />
        <button type="button" className="nav-link" onClick={() => onRetained(retained.filter((_, i) => i !== index))}>Quitar imagen {index + 1}</button>
      </div>)}
      {files.map((file, index) => <div key={index}>
        <FilePreview file={file} />
        <button type="button" className="nav-link" onClick={() => onFiles(files.filter((_, i) => i !== index))}>Quitar imagen {retained.length + index + 1}</button>
      </div>)}
    </div>
    <label className="pf-field">
      <span>Agregar imágenes</span>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple disabled={count >= 3} onChange={(event) => {
        const added = Array.from(event.target.files || [])
        event.target.value = ''
        if (count + added.length > 3) return onError('Podés agregar como máximo 3 imágenes por producto.')
        if (added.some((file) => file.size > 5 * 1024 * 1024)) return onError('Cada imagen debe pesar como máximo 5 MB.')
        onError('')
        onFiles([...files, ...added])
      }} />
    </label>
  </div>
}
