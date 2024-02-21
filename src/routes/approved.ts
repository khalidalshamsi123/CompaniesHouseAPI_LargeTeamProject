import { Router } from 'express'
import pl from 'nodejs-polars'
const router = Router()

router.get('/', (req, res) => {
  res.send("Success").status(200)
})

//reads csv files
function csvReader(csvFile: string){
  let json_csv = pl.readCSV(csvFile);
  return json_csv;
}

//creating a sub route
router.get('/hmrc', (req, res) => {
 //res.send("HMRC page").status(200)
  res.send(csvReader("hmrc-supervised-data-test-data.csv"))
} )


export default router