# L33T P1ZZ4

## Description

This simple web application is created to learn FastAPI, asychronous Postgres, websockets, and Jinja2 templates.

## Installation

To install the dependencies required to run application, you need to have `yarn` and `Docker` installed. Then, run the
following command:

```bash
yarn install
```

## Running the application

To run the application, run the following command:

```bash
yarn up
```

The pizza order form will appear on http://localhost:8000/

Pending orders will appear on http://localhost:8000/orders

Open a few pending orders in different tabs and browsers and see how they are updated in real-time as orders are
submitted, completed, and canceled.

## Shutting down the application

To shut down the application, you can run the following command:

```bash
yarn down
```

## Development

### Building the application

To build the application, you can run the following command:

```bash
yarn build
```

### Linting the application

To lint the application, you can run the following command:

```bash
yarn lint
```

To fix the linting issues, you can run the following command:

```bash
yarn lint:fix
```

### Source formatting

To format the source code, you can run the following command:

```bash
yarn format
```
**NOTE:** This will format the python source code using `black`, so that will need to be installed in your development
environment.
