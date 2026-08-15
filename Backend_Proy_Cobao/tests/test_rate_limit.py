import time

from app.services.rate_limit import RateLimiter


def test_allow_within_limit():
    limiter = RateLimiter(max_attempts=3, window_seconds=60)
    assert limiter.allow("user:1") is True
    assert limiter.allow("user:1") is True
    assert limiter.allow("user:1") is True
    # Cuarto intento: excede el limite
    assert limiter.allow("user:1") is False


def test_different_keys_are_independent():
    limiter = RateLimiter(max_attempts=2, window_seconds=60)
    assert limiter.allow("a") is True
    assert limiter.allow("a") is True
    assert limiter.allow("a") is False
    assert limiter.allow("b") is True


def test_window_expires():
    limiter = RateLimiter(max_attempts=1, window_seconds=1)
    assert limiter.allow("ip:1") is True
    assert limiter.allow("ip:1") is False
    time.sleep(1.1)
    assert limiter.allow("ip:1") is True


def test_reset_clears():
    limiter = RateLimiter(max_attempts=1, window_seconds=60)
    assert limiter.allow("ip:1") is True
    assert limiter.allow("ip:1") is False
    limiter.reset("ip:1")
    assert limiter.allow("ip:1") is True
