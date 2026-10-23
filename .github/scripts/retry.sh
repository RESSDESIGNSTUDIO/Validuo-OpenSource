#!/usr/bin/env bash
# Usage: retry.sh <attempts> <timeout-seconds> <command> [args...]
#
# Runs the command with a time limit per attempt and tries again when it fails or hangs. For steps
# that depend on the network (package registries, apt, Docker Hub), where a hung connection would
# otherwise block the job until its timeout. Never use it for tests: retrying them hides flakiness.
set -u

if [ "$#" -lt 3 ]; then
  echo "usage: retry.sh <attempts> <timeout-seconds> <command> [args...]" >&2
  exit 2
fi

attempts=$1
limit=$2
shift 2

for attempt in $(seq 1 "$attempts"); do
  # `timeout` sends SIGTERM at the limit and SIGKILL 10 s later, so stuck children do not survive.
  timeout --kill-after=10 "$limit" "$@"
  status=$?
  if [ "$status" -eq 0 ]; then
    exit 0
  fi
  if [ "$status" -eq 124 ] || [ "$status" -eq 137 ]; then
    echo "::warning::attempt $attempt/$attempts of '$*' timed out after ${limit}s"
  else
    echo "::warning::attempt $attempt/$attempts of '$*' failed with exit code $status"
  fi
  if [ "$attempt" -lt "$attempts" ]; then
    sleep $((attempt * 5))
  fi
done

echo "::error::'$*' failed after $attempts attempts"
exit 1
