SELECT
  tgt.tgname AS trigger_name,
  nsp.nspname AS schema_name,
  cls.relname AS table_name,
  p.proname AS function_name
FROM
  (
    (
      (
        pg_trigger tgt
        JOIN pg_class cls ON ((tgt.tgrelid = cls.oid))
      )
      JOIN pg_namespace nsp ON ((cls.relnamespace = nsp.oid))
    )
    JOIN pg_proc p ON ((tgt.tgfoid = p.oid))
  )
WHERE
  (
    (p.proname = 'log_table_change' :: name)
    AND (
      nsp.nspname <> ALL (
        ARRAY ['pg_catalog'::name, 'information_schema'::name]
      )
    )
  )
ORDER BY
  nsp.nspname,
  cls.relname;