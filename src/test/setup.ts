// Production runs under TZ=Europe/Berlin (docker/app/compose.base.yml). Tests default to the
// same zone; CI also runs them under TZ=UTC to prove the results are timezone independent.
process.env.TZ ??= 'Europe/Berlin';
