# Yara assignment - Product Warehouse

## Description

Tech stack - Apollo GraphQL, Node.js with TypeScript, Docker.

The project servers as a warehouse platform that allows a user to create a warehouse and keep track of the imports and exports of products in it.

## Requirements

### System Requirements

- Node.js
- Docker

### Environment Setup

You can check the `.env_example` file to set your environment. Please save the file as `.env`.

### Prerequisites

- Install Docker
- Install dependencies: `npm install`
- Run the project: `npm run start`

## Room for improvement

- Provide detailed information on the warehouse current stock/capacity (e.g. which products are scheduled for import and when, which products are scheduled for export and when, etc.)
- Provide a way for the user to create groups of warehouses (e.g. warehouses in the same city, warehouses in the same country, etc.)
- Provide a way for the user to import a product based on the available space in a warehouse group (e.g. if a warehouse is full, the product should be imported in another warehouse in the same group)