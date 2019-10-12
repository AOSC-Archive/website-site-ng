#!/bin/bash -e

redis_pid=$(pidof redis-server) || true
mocha_binary="./node_modules/mocha/bin/mocha"
export NODE_ENV=test
if [[ ${redis_pid} -gt 0 ]]; then
  echo "Using existing redis server (PID: ${redis_pid})"
else
  echo "Starting new redis server instance"
  redis-server &
  redis_pid=$!
  echo "Redis Server PID: $!"
fi

./node_modules/.bin/nyc --reporter=lcovonly "${mocha_binary}"
mocha_status=$?
if [[ ${mocha_status} -ne 0 ]]; then
    exit ${mocha_status}
fi
./node_modules/coveralls/bin/coveralls.js < ./coverage/lcov.info || true
