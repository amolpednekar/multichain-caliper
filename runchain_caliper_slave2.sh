#!/bin/bash -x

echo "Sleep for 8 seconds so the master node has initialised"
sleep 12


ip=`getent hosts slavenode1 | awk -F' ' '{print $1}'`
multichaind dockerchain@$ip:5000 -port=7000 -rpcport=6999 -printtoconsole -shrinkdebugfilesize


echo "Setup2 /root/.multichain/multichain.conf"

cat << EOF > /root/.multichain/$CHAINNAME/multichain.conf
rpcuser=$RPC_USER
rpcpassword=$RPC_PASSWORD
rpcallowip=$RPC_ALLOW_IP
rpcport=$RPC_PORT
EOF


cp /root/.multichain/$CHAINNAME/multichain.conf /root/.multichain/multichain.conf