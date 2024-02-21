import { Router } from 'express'
import pl, { col } from 'nodejs-polars'
const router = Router()

router.get('/', (req, res) => {
	res.send('Success').status(200);
});


function csvReader(csvFile: string, columnName1: string, columnName2: string){
  //reads the file
  let csvData = pl.readCSV(csvFile);
  //filters the response with two columns
  let filteredData = csvData.select(columnName1, columnName2);
  return filteredData;
}

//creating a sub route
router.get('/hmrc', (req, res) => {
  res.send(csvReader("hmrc-supervised-data-test-data.csv", 'BUSINESS_NAME', 'STATUS1')).status(200);
} )


export default router
