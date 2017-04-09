#!/bin/bash
clean_up() {
    kill -TERM "${redis_pid}";
    exit "$1";
}

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

NODE_ENV=test ./node_modules/.bin/istanbul cover "${mocha_binary}" --report lcovonly -- -R spec
mocha_status=$?
if [[ ${mocha_status} -ne 0 ]]; then
    clean_up ${mocha_status}
fi
./node_modules/coveralls/bin/coveralls.js < ./coverage/lcov.info || true
clean_up 0
