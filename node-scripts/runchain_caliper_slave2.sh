#!/bin/bash -x

echo "Sleep for 10 seconds so the master node has initialised"
sleep 10

echo "Start the chain"

chmod 777 /root/server/event-listener-websockets/script.sh

ip=`getent hosts masternode | awk -F' ' '{print $1}'`

multichaind -port=3447 -rpcport=3448 dockerchain@$ip:1447 -autosubscribe=streams -walletnotify="/root/server/event-listener-websockets/script.sh %s %c"