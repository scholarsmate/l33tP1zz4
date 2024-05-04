# app/database/db.py

"""
This module provides a Database class that interacts with the database.
"""
import logging
import os

import asyncpg

# Global variable to cache the database connection instance
DATABASE_INSTANCE = None


class Database:
    """
    This class is used to interact with the database.
    """

    def __init__(self, dsn: str):
        """
        This method initializes the Database class
        :param dsn: connection string to the database
        """
        self.dsn = dsn
        self.pool = None

    async def connect(self) -> None:
        """
        This method creates a connection pool to the database
        :return: None
        """
        self.pool = await asyncpg.create_pool(self.dsn)

    async def close(self) -> None:
        """
        This method closes the connection pool
        :return: None
        """
        await self.pool.close()

    async def fetch(self, query: str, *args: list[str]) -> list[dict]:
        """
        This method fetches data from the database
        :param query: query string to execute
        :param args: arguments to bind into the query`
        :return: records fetched from the database as a list of dictionaries
        """
        async with self.pool.acquire() as connection:
            return await connection.fetch(query, *args)

    async def fetchrow(self, query: str, *args: list[str]) -> dict:
        """
        This method fetches a single row from the database
        :param query: query string to execute
        :param args: arguments to bind into the query
        :return: dict representing the row fetched
        """
        async with self.pool.acquire() as connection:
            return await connection.fetchrow(query, *args)

    async def fetchval(self, query: str, *args: list[str]) -> any:
        """
        This method fetches a single value from the database
        :param query: query string to execute
        :param args: arguments to bind into the query
        :return: value fetched from the database as any type
        """
        async with self.pool.acquire() as connection:
            return await connection.fetchval(query, *args)

    async def execute(self, query: str, *args: list[str]):
        """
        This method executes a query on the database
        :param query: query string to execute
        :param args: arguments to bind into the query
        :return:
        """
        async with self.pool.acquire() as connection:
            return await connection.execute(query, *args)


def get_database() -> Database:
    """
    This function gets the database object.
    """
    global DATABASE_INSTANCE
    if DATABASE_INSTANCE is None:
        db_url = os.environ["DATABASE_URL"]
        logging.info("Connecting to database: %s", db_url)
        DATABASE_INSTANCE = Database(db_url)
        logging.info("Database connected")
    return DATABASE_INSTANCE
