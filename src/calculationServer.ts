import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const port = process.env.CALCULATION_SERVER_PORT || 3000;

app.use(express.json());

app.get('/currentStock/:warehouseId', async (req, res) => {
  const { warehouseId } = req.params;
  console.log(`Calculating current stock for warehouse ${warehouseId}`);

  res.status(200).json({ currentStock: 100 });
  // Perform the calculation using Prisma or direct database queries
  // For example, sum the quantity of stock movements for this warehouse
  // Let's assume you have a function `calculateCurrentStock` for this

  // try {
  //   const currentStock = await calculateCurrentStock(warehouseId);
  //   res.json({ warehouseId, currentStock });
  // } catch (error) {
  //   res.status(500).json({ error: error.message });
  // }
});


app.listen(port, () => {
  console.log(`Calculation server listening at http://localhost:${port}`);
});