SELECT
  climate_market_data_cache.cache_key,
  climate_market_data_cache.hit_count,
  climate_market_data_cache.cached_at,
  climate_market_data_cache.expires_at,
  climate_market_data_cache.last_accessed,
  (
    EXTRACT(
      epoch
      FROM
        (
          climate_market_data_cache.expires_at - climate_market_data_cache.cached_at
        )
    ) / (3600) :: numeric
  ) AS ttl_hours,
  (
    EXTRACT(
      epoch
      FROM
        (NOW() - climate_market_data_cache.last_accessed)
    ) / (60) :: numeric
  ) AS minutes_since_access,
  CASE
    WHEN (climate_market_data_cache.expires_at > NOW()) THEN 'valid' :: text
    ELSE 'expired' :: text
  END AS STATUS
FROM
  climate_market_data_cache
ORDER BY
  climate_market_data_cache.hit_count DESC,
  climate_market_data_cache.last_accessed DESC;