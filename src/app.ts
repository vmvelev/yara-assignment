import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from '@apollo/server/standalone';
import { prisma } from "./prisma/client.js";
import { gql } from "graphql-tag";
import dotenv from "dotenv";

dotenv.config();

const calculationServerURL = `http://localhost:${process.env.CALCULATION_SERVER_PORT || "3000"}`;

const startServer = async () => {
  const typeDefs = gql`
  type Query {
    warehouses: [Warehouse]
    products: [Product]
    stockMovements: [StockMovement]
    currentStock(warehouseId: Int!): Float
  }

  type Mutation {
    addWarehouse(
      name: String!,
      capacity: Float!
    ): Warehouse

    editWarehouse(
      id: Int!,
      name: String!,
      capacity: Float!
    ): Warehouse

    removeWarehouse(
      id: Int!
    ): Warehouse

    addProduct(
      name: String!,
      sizePerUnit: Float!,
      isHazardous: Boolean!
    ): Product

    editProduct(
      id: Int!,
      name: String!,
      sizePerUnit: Float!,
      isHazardous: Boolean!
    ): Product

    removeProduct(
      id: Int!
    ): Product

    moveStock(
      warehouseId: Int!,
      productId: Int!,
      quantity: Float!,
      movementType: MovementType!,
      date: String!
    ): StockMovement
  }

  type Warehouse {
    id: ID!
    name: String!
    capacity: Float!
    stockMovements: [StockMovement]
  }

  type Product {
    id: ID!
    name: String!
    sizePerUnit: Float!
    isHazardous: Boolean!
    stockMovements: [StockMovement]
  }

  enum MovementType {
    import
    export
  }

  type StockMovement {
    id: ID!
    warehouse: Warehouse!
    product: Product!
    quantity: Float!
    movementType: MovementType!
    date: String!
  }
`;

  const resolvers = {
    Query: {
      warehouses: async () => {
        return await prisma.warehouse.findMany(
          {
            include: {
              stockMovements: {
                include: {
                  product: true,
                },
              },
            },
          }
        );
      },
      products: async () => {
        return await prisma.product.findMany(
          {
            include: {
              stockMovements: {
                include: {
                  warehouse: true,
                },
              },
            },
          }
        );
      },
      stockMovements: async () => {
        return await prisma.stockMovement.findMany(
          {
            include: {
              warehouse: true,
              product: true,
            },
          }
        );
      },
      currentStock: async (_: any, { warehouseId }: { warehouseId: number }) => {
        try {
          const response = await fetch(`${calculationServerURL}/currentStock/${warehouseId}`);
          const json = await response.json() as { currentStock: number };
          return json.currentStock;
        } catch (error) {
          throw new Error((error as Error).message);
        }
      },
    },
    Mutation: {
      addWarehouse: async (_: any, args: {
        name: string;
        capacity: number;
      }) => {
        return await prisma.warehouse.create({
          data: {
            name: args.name,
            capacity: args.capacity,
          },
        });
      },
      editWarehouse: async (_: any, args: {
        id?: number;
        name?: string;
        capacity: number;
      }) => {
        return await prisma.warehouse.update({
          where: { id: args.id },
          data: {
            name: args.name,
            capacity: args.capacity
          },
        });
      },
      removeWarehouse: async (_: any, args: {
        id: number;
      }) => {
        return await prisma.warehouse.delete({
          where: { id: args.id },
        });
      },
      addProduct: async (_: any, args: {
        name: string;
        sizePerUnit: number;
        isHazardous: boolean;
      }) => {
        return await prisma.product.create({
          data: {
            name: args.name,
            sizePerUnit: args.sizePerUnit,
            isHazardous: args.isHazardous,
          },
        });
      },
      editProduct: async (_: any, args: {
        id: number;
        name: string;
        sizePerUnit: number;
        isHazardous: boolean;
      }) => {
        return await prisma.product.update({
          where: { id: args.id },
          data: {
            name: args.name,
            sizePerUnit: args.sizePerUnit,
            isHazardous: args.isHazardous,
          },
        });
      },
      removeProduct: async (_: any, args: {
        id: number;
      }) => {
        return await prisma.product.delete({
          where: { id: args.id },
        });
      },
      moveStock: async (_: any, args: {
        warehouseId: number;
        productId: number;
        quantity: number;
        movementType: "import" | "export";
        date: string;
      }) => {
        // Check if the product exists
        const product = await prisma.product.findUnique({
          where: { id: args.productId },
        });

        if (!product) {
          throw new Error("Product not found");
        }

        // Fetch existing stock movements for the product in the warehouse
        const existingMovements = await prisma.stockMovement.findMany({
          where: { warehouseId: args.warehouseId, productId: args.productId },
        });

        // Calculate the current stock for the product
        let currentStock = 0;
        existingMovements.forEach(movement => {
          currentStock += movement.movementType === "import" ? movement.quantity : -movement.quantity;
        });

        // Check for hazardous conflict if the movement is an import
        if (args.movementType === "import") {
          const otherProductsInWarehouse = await prisma.stockMovement.findMany({
            where: { warehouseId: args.warehouseId },
            include: { product: true },
          });

          // Filter out movements of the same product and calculate stock of other products
          const otherProductsStock = otherProductsInWarehouse
            .filter(movement => movement.product.id !== args.productId)
            .reduce((acc, movement) => {
              return acc + (movement.movementType === "import" ? movement.quantity : -movement.quantity);
            }, 0);

          // Check for hazardous conflict only if there are other products in the warehouse
          if (otherProductsStock > 0) {
            const isHazardousConflict = otherProductsInWarehouse.some(movement =>
              movement.product.isHazardous !== product.isHazardous
            );

            if (isHazardousConflict) {
              throw new Error("Cannot store hazardous and non-hazardous products in the same warehouse");
            }
          }
        }

        // Check if enough product is available for export
        if (args.movementType === "export" && currentStock < args.quantity) {
          throw new Error("Not enough product in the warehouse to export");
        }

        // Proceed with the stock movement
        return await prisma.stockMovement.create({
          data: {
            warehouseId: args.warehouseId,
            productId: args.productId,
            quantity: args.quantity,
            movementType: args.movementType,
            date: args.date
          },
        });
      },
    },
  };

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    context: async ({ req }) => ({ token: req.headers.token }),
    listen: { port: parseInt(process.env.APOLLO_SERVER_PORT || "4000") },
  });

  console.log(`Server ready at ${url}`);
};

startServer();