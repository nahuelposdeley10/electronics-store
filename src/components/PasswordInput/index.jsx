import { useId, useState } from 'react'
import { IconEye, IconEyeOff } from '@/components/Icons'
import './styles.css'

export default function PasswordInput({
  label,
  labelClassName = '',
  inputClassName = '',
  hint = '',
  hintClassName = 'password-hint',
  value,
  onChange,
  id,
  ...rest
}) {
  const generatedId = useId()
  const inputId = id || `password-${generatedId}`
  const [visible, setVisible] = useState(false)
  const fieldClassName = ['password-field', labelClassName].filter(Boolean).join(' ')
  const inputClasses = ['password-input', inputClassName].filter(Boolean).join(' ')

  return (
    <label className={fieldClassName} htmlFor={inputId}>
      <span>{label}</span>
      <span className="password-control">
        <input
          {...rest}
          id={inputId}
          className={inputClasses}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <IconEyeOff /> : <IconEye />}
        </button>
      </span>
      {hint && <span className={hintClassName}>{hint}</span>}
    </label>
  )
}
