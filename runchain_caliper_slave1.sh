#!/bin/bash -x

echo "Sleep for 8 seconds so the master node has initialised"
sleep 8

echo "Start the chain"

ip=`getent hosts masternode | awk -F' ' '{print $1}'`
multichaind dockerchain@$ip:5000 -port=6000 -rpcport=5999 -printtoconsole -shrinkdebugfilesize


echo "Setup /root/.multichain/multichain.conf"

cat << EOF > /root/.multichain/$CHAINNAME/multichain.conf
rpcuser=$RPC_USER
rpcpassword=$RPC_PASSWORD
rpcallowip=$RPC_ALLOW_IP
rpcport=$RPC_PORT
EOF


cp /root/.multichain/$CHAINNAME/multichain.conf /root/.multichain/multichain.conf