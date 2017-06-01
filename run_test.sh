#!/bin/bash
if [[ ${TRAVIS_NODE_VERSION} == "node"  ]]; then
    ./run_coverage.sh
    exit $?
fi
mocha_binary=$(which mocha) || mocha_binary="./node_modules/mocha/bin/_mocha"
redis_pid=$(pidof redis-server)
if [[ ${redis_pid} -gt 0 ]]; then
  echo "Using existing redis server (PID: ${redis_pid})"
else
  echo "Starting new redis server instance"
  redis-server &
  redis_pid=$!
  echo "Redis Server PID: $!"
fi

"${mocha_binary}" "$@"
mocha_status=$?
kill -TERM ${redis_pid}
exit ${mocha_status}
