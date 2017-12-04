#!/bin/bash -x

echo "Sleep for 5 seconds so the master node has initialised"
sleep 5

echo "Start the chain"

ip=`getent hosts masternode | awk -F' ' '{print $1}'`
multichaind -port=3447 -rpcport=3448 dockerchain@$ip:1447 -autosubscribe=streams