#!/bin/bash

# Fallback for the $CHAINNAME variable
if [ -z "$CHAINNAME" ]; then
    CHAINNAME='DockerChain'
fi

# Fallback for the $NETWORK_PORT variable
if [ -z "$NETWORK_PORT" ]; then
    NETWORK_PORT=1000
fi

# Fallback for the $RPC_PORT variable
if [ -z "$RPC_PORT" ]; then
    RPC_PORT=999
fi

# Fallback for the $RPC_USER variable
if [ -z "$RPC_USER" ]; then
    RPC_USER="username"
fi

# Fallback for the $RPC_PASSWORD variable
if [ -z "$RPC_PASSWORD" ]; then
    RPC_PASSWORD="password"
fi

# Fallback for the $RPC_ALLOW_IP variable
if [ -z "$RPC_ALLOW_IP" ]; then
    RPC_ALLOW_IP="0.0.0.0/0.0.0.0"
fi

# Create the chain if it is not there yet
if [ ! -d /root/.multichain/$CHAINNAME ]; then
    multichain-util create $CHAINNAME

    # Set some required parameters in the params.dat
    sed -i "s/^default-network-port.*/default-network-port = $NETWORK_PORT/" /root/.multichain/$CHAINNAME/params.dat
    sed -i "s/^default-rpc-port.*/default-rpc-port = $RPC_PORT/" /root/.multichain/$CHAINNAME/params.dat
    sed -i "s/^chain-name.*/chain-name = $CHAINNAME/" /root/.multichain/$CHAINNAME/params.dat
    sed -i "s/^chain-description.*/chain-description = MultiChain $CHAINNAME/" /root/.multichain/$CHAINNAME/params.dat
    # sed -i "s/^anyone-can-connect.*/anyone-can-connect = true/" /root/.multichain/$CHAINNAME/params.dat
    sed -i "s/^target-block-time.*/target-block-time = 2/" /root/.multichain/$CHAINNAME/params.dat
    sed -i "s/^mine-empty-rounds.*/ mine-empty-rounds = -1/" /root/.multichain/$CHAINNAME/params.dat
    sed -i "s/^setup-first-blocks.*/setup-first-blocks = 3/" /root/.multichain/$CHAINNAME/params.dat
    sed -i "s/^maximum-block-size.*/maximum-block-size = 1000000000/" /root/.multichain/$CHAINNAME/params.dat
    sed -i "s/^max-std-op-return-size.*/max-std-op-return-size = 67108864/" /root/.multichain/$CHAINNAME/params.dat
    sed -i "s/^max-std-tx-size.*/max-std-tx-size = 100000000/" /root/.multichain/$CHAINNAME/params.dat
fi

cat /root/.multichain/$CHAINNAME/params.dat

cat << EOF > /root/.multichain/$CHAINNAME/multichain.conf
rpcuser=$RPC_USER
rpcpassword=$RPC_PASSWORD
rpcallowip=$RPC_ALLOW_IP
rpcport=$RPC_PORT
EOF

if [ ! -z "$BLOCKNOTIFY_SCRIPT" ]; then
    echo "blocknotify=$BLOCKNOTIFY_SCRIPT %s" >> /root/.multichain/$CHAINNAME/multichain.conf
fi

cp /root/.multichain/$CHAINNAME/multichain.conf /root/.multichain/multichain.conf

chmod 777 /root/server/event-listener-websockets/script.sh

multichaind $CHAINNAME -debug=mcapi -rpcthreads=9000 -printtoconsole -rpckeepalive=1 -autosubscribe=streams -blocknotify="/root/server/event-listener-websockets/script.sh %s"