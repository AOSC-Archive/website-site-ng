#!/bin/bash

redis_pid=$(pidof redis-server)
mocha_binary="./node_modules/mocha/bin/_mocha"
if [[ ${redis_pid} -gt 0 ]]; then
  echo "Using existing redis server (PID: ${redis_pid})"
else
  echo "Starting new redis server instance"
  redis-server &
  redis_pid=$!
  echo "Redis Server PID: $!"
fi

node app.js &
app_pid=$!
sleep 3
echo "Main process PID: $app_pid"

NODE_ENV=test ./node_modules/.bin/istanbul cover "${mocha_binary}" --report lcovonly -- -R spec
kill -TERM ${app_pid} || true
mocha_status=$?
if [[ ${mocha_status} -ne 0 ]]; then
    exit ${mocha_status}
fi
./node_modules/coveralls/bin/coveralls.js < ./coverage/lcov.info || true
