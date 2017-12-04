#!/bin/bash -x

echo "Sleep for 90 seconds so the master node has initialised"
sleep 120

echo "Start the chain"

ip=`getent hosts masternode | awk -F' ' '{print $1}'`
multichaind -port=2447 -rpcport=2448 dockerchain@$ip:1447 -autosubscribe=streams