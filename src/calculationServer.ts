import express from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.CALCULATION_SERVER_PORT || 3000;

app.use(express.json());

app.get('/currentStock/:warehouseId', async (req, res) => {
  const { warehouseId } = req.params;

  try {
    const stockMovements = await prisma.stockMovement.findMany({
      where: { warehouseId: parseInt(warehouseId) },
    });

    let currentStock = 0;
    stockMovements.forEach(movement => {
      if (movement.movementType === 'import') {
        currentStock += movement.quantity;
      } else if (movement.movementType === 'export') {
        currentStock -= movement.quantity;
      }
    });

    res.status(200).json({ currentStock });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

app.listen(port, () => {
  console.log(`Calculation server listening at http://localhost:${port}`);
});
