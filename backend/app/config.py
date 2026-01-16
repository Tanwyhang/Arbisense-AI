"""
Configuration loader for ARBISENSE
Loads settings from config.json and credentials from .env
"""
import json
import os
from pathlib import Path
from typing import Any, Dict


class Config:
    """Configuration manager for ARBISENSE backend"""
    
    _instance = None
    _config: Dict[str, Any] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_config()
        return cls._instance
    
    def _load_config(self):
        """Load configuration from config.json"""
        config_path = Path(__file__).parent.parent / "config.json"
        
        if not config_path.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")
        
        with open(config_path, 'r') as f:
            self._config = json.load(f)
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value using dot notation
        Example: config.get('server.port')
        """
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
        return self.get('performance.monte_carlo_paths', 80)
    
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


# Singleton instance
config = Config()
