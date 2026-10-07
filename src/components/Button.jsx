import { Link } from 'react-router'

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return <button className={`button button--${variant} ${className}`} type={type} {...props} />
}

export function ButtonLink({ variant = 'primary', className = '', ...props }) {
  return <Link className={`button button--${variant} ${className}`} {...props} />
}
