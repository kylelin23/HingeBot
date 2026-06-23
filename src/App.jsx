import { Routes, Route } from 'react-router-dom'
import ReplyPage from './ReplyPage'
import TrainPage from './TrainPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ReplyPage />} />
      <Route path="/train" element={<TrainPage />} />
    </Routes>
  )
}

export default App