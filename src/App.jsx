import { BrowserRouter } from 'react-router'
import AppRouter from './app/AppRouter.jsx'
import StorageProvider from './app/StorageProvider.jsx'

export default function App() {
  return <BrowserRouter><StorageProvider><AppRouter /></StorageProvider></BrowserRouter>
}
