"""
Keep-alive service for Render deployment.
Runs as a background task to ping the backend every 14 minutes.
"""

from __future__ import annotations

import asyncio
import logging
import os

import aiohttp

logger = logging.getLogger(__name__)


class KeepAliveService:
    def __init__(self) -> None:
        self.running = False
        self.task: asyncio.Task | None = None
        port = os.getenv("PORT", "8000")
        self.backend_url = os.getenv("RENDER_EXTERNAL_URL", f"http://localhost:{port}")
        self.ping_interval = int(os.getenv("KEEPALIVE_INTERVAL", "840"))

    async def ping_self(self) -> bool:
        try:
            keepalive_url = f"{self.backend_url}/api/keepalive"

            async with aiohttp.ClientSession() as session:
                async with session.get(keepalive_url, timeout=30) as response:
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"Self-ping successful: {data.get('message', 'OK')}")
                        return True
                    logger.warning(f"Self-ping returned status {response.status}")
                    return False

        except asyncio.TimeoutError:
            logger.warning("Self-ping timed out")
            return False
        except Exception as e:
            logger.warning(f"Self-ping failed: {str(e)}")
            return False

    async def keep_alive_loop(self) -> None:
        logger.info("Starting keep-alive service")
        logger.info(f"Backend URL: {self.backend_url}")
        logger.info(f"Ping interval: {self.ping_interval} seconds ({self.ping_interval / 60:.1f} minutes)")

        await asyncio.sleep(120)

        while self.running:
            try:
                await self.ping_self()
                await asyncio.sleep(self.ping_interval)
            except asyncio.CancelledError:
                logger.info("Keep-alive service cancelled")
                break
            except Exception as e:
                logger.error(f"Error in keep-alive loop: {str(e)}")
                await asyncio.sleep(60)

        logger.info("Keep-alive service stopped")

    def start(self) -> None:
        if not self.running:
            self.running = True
            self.task = asyncio.create_task(self.keep_alive_loop())
            logger.info("Keep-alive service started")

    async def stop(self) -> None:
        if self.running:
            self.running = False
            if self.task:
                self.task.cancel()
                try:
                    await self.task
                except asyncio.CancelledError:
                    pass
            logger.info("Keep-alive service stopped")


keepalive_service = KeepAliveService()
