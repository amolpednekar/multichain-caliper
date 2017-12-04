#!/bin/bash -x

echo "Sleep for 5 seconds so the master node has initialised"
sleep 5

echo "Start the chain"

ip=`getent hosts masternode | awk -F' ' '{print $1}'`
multichaind -port=2447 -rpcport=2448 -printtoconsole -shrinkdebugfilesize dockerchain@$ip:1447 autosubscribe=streams