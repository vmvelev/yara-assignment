import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from '@apollo/server/standalone';
import { prisma } from "./prisma/client.js";
import { gql } from "graphql-tag";
import dotenv from "dotenv";

dotenv.config();

const startServer = async () => {
  const typeDefs = gql`
  type Query {
    warehouses: [Warehouse]
    products: [Product]
    stockMovements: [StockMovement]
  }

  type Mutation {
    addWarehouse(
      name: String!,
      capacity: Float!,
      isHazardous: Boolean!
    ): Warehouse

    addProduct(
      name: String!,
      sizePerUnit: Float!,
      isHazardous: Boolean!
    ): Product

    moveStock(
      warehouseId: Int!,
      productId: Int!,
      quantity: Float!,
      movementType: String!,
      date: String!
    ): StockMovement
  }

  type Warehouse {
    id: ID!
    name: String!
    capacity: Float!
    isHazardous: Boolean!
    stockMovements: [StockMovement]
  }

  type Product {
    id: ID!
    name: String!
    sizePerUnit: Float!
    isHazardous: Boolean!
    stockMovements: [StockMovement]
  }

  type StockMovement {
    id: ID!
    warehouse: Warehouse!
    product: Product!
    quantity: Float!
    movementType: String!
    date: String!
  }
`;

  const resolvers = {
    Query: {
      warehouses: async () => {
        return await prisma.warehouse.findMany();
      },
      products: async () => {
        return await prisma.product.findMany();
      },
      stockMovements: async () => {
        return await prisma.stockMovement.findMany();
      },
    },
    Mutation: {
      addWarehouse: async (_: any, args: {
        name: string;
        capacity: number;
        isHazardous: boolean;
      }) => {
        return await prisma.warehouse.create({
          data: {
            name: args.name,
            capacity: args.capacity,
            isHazardous: args.isHazardous,
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
        movementType: string;
        date: string;
      }) => {
        return await prisma.stockMovement.create({
          data: {
            warehouseId: args.warehouseId,
            productId: args.productId,
            quantity: args.quantity,
            movementType: args.movementType,
            date: args.date,
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