# Architecture Rules

- All Campus Jobs writes must pass through the `manage-campus-jobs` Edge Function, which verifies the signed admin session before using its server-only privileged database client; browser clients are read-only for these records so students cannot mutate recruitment data.
