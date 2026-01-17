"""
Configuration loader for ARBISENSE
Loads settings from config.json and credentials from .env
"""
import json
import os
from pathlib import Path
from typing import Any, Dict
from datetime import datetime


class Config:
    """Configuration manager for ARBISENSE backend"""

    _instance = None
    _config: Dict[str, Any] = {}
    _config_path: Path = None
    _last_modified: float = 0

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._config_path = Path(__file__).parent.parent / "config.json"
            cls._instance._load_config()
        return cls._instance

    def _load_config(self):
        """Load configuration from config.json"""
        if not self._config_path.exists():
            raise FileNotFoundError(f"Config file not found: {self._config_path}")

        with open(self._config_path, 'r') as f:
            self._config = json.load(f)
            self._last_modified = os.path.getmtime(self._config_path)

    def reload(self):
        """
        Reload configuration from file.
        Call this to refresh config without restarting the server.
        """
        self._load_config()

    def _check_and_reload_if_changed(self):
        """
        Check if config file has been modified and reload if necessary.
        This enables hot-reload of configuration changes.
        """
        if not self._config_path.exists():
            return

        current_mtime = os.path.getmtime(self._config_path)
        if current_mtime > self._last_modified:
            print(f"[Config] Detected change in config.json, reloading...")
            self._load_config()
            print(f"[Config] Reloaded at {datetime.now().strftime('%H:%M:%S')}")
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value using dot notation
        Example: config.get('server.port')

        Automatically hot-reloads config if file has changed.
        """
        # Auto-detect and reload config changes
        self._check_and_reload_if_changed()

        keys = key.split('.')
        value = self._config

        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
                if value is None:
                    return default
            else:
                return default

        return value
    
    @property
    def environment(self) -> str:
        return self.get('environment', 'development')
    
    @property
    def server_host(self) -> str:
        return self.get('server.host', '0.0.0.0')
    
    @property
    def server_port(self) -> int:
        return self.get('server.port', 8000)
    
    @property
    def server_reload(self) -> bool:
        return self.get('server.reload', True)
    
    @property
    def max_compute_time_ms(self) -> int:
        return self.get('performance.max_compute_time_ms', 1100)
    
    @property
    def monte_carlo_paths(self) -> int:
        # Single source of truth for all Monte Carlo simulations
        # Used by both main pipeline and optimizer
        return self.get('performance.monte_carlo_paths', 200)
    
    @property
    def warmup_paths(self) -> int:
        return self.get('performance.warmup_paths', 10)
    
    @property
    def cors_origins(self) -> list:
        return self.get('cors.allow_origins', ['*'])
    
    @property
    def cors_credentials(self) -> bool:
        return self.get('cors.allow_credentials', True)
    
    @property
    def cors_methods(self) -> list:
        return self.get('cors.allow_methods', ['*'])
    
    @property
    def cors_headers(self) -> list:
        return self.get('cors.allow_headers', ['*'])

    @property
    def optimizer_default_model(self) -> str:
        return self.get('optimizer.default_model', 'anthropic/claude-3.5-sonnet')

    @property
    def optimizer_fallback_model(self) -> str:
        return self.get('optimizer.fallback_model', 'openai/gpt-4-turbo')

    @property
    def optimizer_max_iterations(self) -> int:
        return self.get('optimizer.max_iterations', 3)

    @property
    def optimizer_max_consensus_rounds(self) -> int:
        return self.get('optimizer.max_consensus_rounds', 5)

    @property
    def optimizer_convergence_threshold(self) -> float:
        return self.get('optimizer.convergence_threshold', 0.8)

    @property
    def optimizer_simulation_days(self) -> int:
        return self.get('optimizer.simulation_days', 30)

    @property
    def optimizer_monte_carlo_paths(self) -> int:
        # Alias to maintain compatibility, but uses single source of truth
        return self.monte_carlo_paths

    @property
    def optimizer_agent_count(self) -> int:
        return self.get('optimizer.agent_count', 5)


# Singleton instance
config = Config()
