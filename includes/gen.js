// Generate the region specific SQL for exporting the results to GCS
function export_region_jobs_timeline(region) {
    return `
    CREATE TEMPORARY TABLE jobs_timeline_${ region } AS
    SELECT
        "${ region }" as region
      , period_start
      , project_id
      , job_id
      , period_slot_ms
      , IF(state = 'DONE', total_bytes_processed, 0) AS total_bytes_processed
      , job_type
      , statement_type
      , job_creation_time
      , job_start_time
      , job_end_time
      , state AS job_state
      , reservation_id
      , CASE WHEN reservation_id IS NULL AND job_type = "QUERY"
             THEN "On-Demand"
             WHEN reservation_id IS NOT NULL AND reservation_id != "default-pipeline"
             THEN "Reservations"
        END AS pricing_model
    FROM \`region-${ region }.INFORMATION_SCHEMA.JOBS_TIMELINE_BY_ORGANIZATION\`
    WHERE job_creation_time >= "${ dataform.projectConfig.vars.START_DATE }"

      -- Avoid duplicate byte counting in parent and children jobs.
      AND (statement_type != "SCRIPT" OR statement_type IS NULL)

      -- Only Valid Reservations or On-Demand Slot Usage
       AND (   (reservation_id IS NULL AND job_type = "QUERY")
            OR (reservation_id IS NOT NULL AND reservation_id != "default-pipeline"))
    ;

    EXPORT DATA
    OPTIONS (
      format = "CSV",
      overwrite = true,
      uri = "gs://${ dataform.projectConfig.vars.EXPORT_GCS_BUCKET }/${ region }/jobs_timeline_*.csv"
    ) AS
    SELECT * FROM jobs_timeline_${ region }
    ;`;
};

module.exports = { export_region_jobs_timeline };