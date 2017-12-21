#!/bin/bash -x

echo "Sleep for 5 seconds so the master node has initialised"
sleep 10

echo "Start the chain"

chmod 777 /root/server/event-listener-websockets/script.sh

#ip=`getent hosts masternode | awk -F' ' '{print $1}'`

multichaind -port=2447 -rpcport=2448 dockerchain@$MASTERNODE_IP:1000 -autosubscribe=streams -walletnotify="/root/server/event-listener-websockets/script.sh %s %c"