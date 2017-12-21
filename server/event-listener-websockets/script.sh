#!/bin/bash

#echo  $2
# node /root/server/event-listener-websockets/event-emitter-node.js $1 $2
# echo "script.sh triggered"
# echo $1 $2
if [ $2 -eq 1 ]; then
    echo $1 | nc $EVENT_LISTENER_IP 1339
fi