import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { BigNumber } from 'bignumber.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.CALCULATION_SERVER_PORT || 3000;

app.use(express.json());

app.get('/currentCapacity/:warehouseId', async (req: Request, res: Response) => {
  const { warehouseId } = req.params;

  try {
    const stockMovements = await prisma.stockMovement.findMany({
      where: { warehouseId: parseInt(warehouseId) },
      include: {
        product: true,
        warehouse: true
      },
    });

    let currentStock = 0;
    stockMovements.forEach(movement => {
      const bigQuantity = new BigNumber(movement.quantity);
      const bigSizePerUnit = new BigNumber(movement.product.sizePerUnit);
      const quantity = bigQuantity.multipliedBy(bigSizePerUnit).toNumber();
      if (movement.movementType === 'import') {
        currentStock = new BigNumber(currentStock).plus(quantity).toNumber();
      } else if (movement.movementType === 'export') {
        currentStock = new BigNumber(currentStock).minus(quantity).toNumber();
      }
    });

    // Get total capacity of the warehouse from stockMovements
    const warehouseCapacity = stockMovements[0].warehouse.capacity;

    // Get remaining capacity of the warehouse
    const bigCapacity = new BigNumber(warehouseCapacity);
    const bigCurrentStock = new BigNumber(currentStock);
    const remainingCapacity = bigCapacity.minus(bigCurrentStock).toNumber();
    res.status(200).json({
      currentCapacity: currentStock,
      warehouseCapacity,
      remainingCapacity
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

app.get('/currentProductStock/:warehouseId/:productId', async (req: Request, res: Response) => {
  const { warehouseId, productId } = req.params;

  try {
    const stockMovements = await prisma.stockMovement.findMany({
      where: {
        warehouseId: parseInt(warehouseId),
        productId: parseInt(productId),
      },
    });

    let currentStock = 0;
    stockMovements.forEach(movement => {
      if (movement.movementType === 'import') {
        currentStock = new BigNumber(currentStock).plus(new BigNumber(movement.quantity)).toNumber();
      } else if (movement.movementType === 'export') {
        currentStock = new BigNumber(currentStock).minus(new BigNumber(movement.quantity)).toNumber();
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

app.get('/requiredSpace/:productId/:quantity', async (req: Request, res: Response) => {
  const { productId, quantity } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const bigSizePerUnit = new BigNumber(product.sizePerUnit);
    const bigQuantity = new BigNumber(quantity);
    const requiredSpace = bigSizePerUnit.multipliedBy(bigQuantity).toNumber();
    res.status(200).json({ requiredSpace });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});


app.listen(port, () => {
  console.log(`Calculation server ready at http://localhost:${port}`);
});
