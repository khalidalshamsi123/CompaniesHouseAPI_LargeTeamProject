import { Router } from 'express'
import pl, { DataFrame, col } from 'nodejs-polars'
const router = Router()

router.get('/', (req, res) => {
  res.send('Success').status(200);
})


function csvReader(csvFile: string, columnName1: string, columnName2: string, targetValue: string){
  //reads the file
  let csvData = pl.readCSV(csvFile);

  //filters the response with two columns
  let columnOneValues = csvData.getColumn(columnName1);
  let columnTwoValues = csvData.getColumn(columnName2);

  let index = 0;
  //looping to find the index of a specific value
  for(let i = 0; i < columnOneValues.length; i++){
    if(columnOneValues[i] === targetValue){
      index = i;
      break;
    }
  }

  //Grouping the two values in one variable.
  let specificValue = columnOneValues[index] + columnTwoValues[index];

  return specificValue;
}

//creating a sub route
router.get('/hmrc', (req, res) => {
  res.send(csvReader('hmrc-supervised-data-test-data.csv', 'BUSINESS_NAME', 'STATUS1', 'HARRY SMITH AND SONS')).status(200);
} )


export default router;