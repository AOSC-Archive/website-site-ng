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

NODE_ENV=test ./node_modules/.bin/istanbul cover "${mocha_binary}" --report lcovonly -- -R spec && \
		cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js || true

mocha_status=$?
kill -TERM ${redis_pid}
exit ${mocha_status}
