import { Router } from 'express'
const router = Router()

router.get('/', (req, res) => {
  res.send("Success").status(200)
})

export default router