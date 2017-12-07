package main

import (
	"fmt"
	"strconv"
	"encoding/json"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

type AccountChaincode struct {
}

func (t *AccountChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("AccountChaincode Init1")
	return shim.Success(nil)

}
func (t *AccountChaincode) addAccounts(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	fmt.Println("Add accounts")
	
	num, err := strconv.Atoi(args[0])
	if err != nil {
		return shim.Error(err.Error())
	}
	slice := make([]int, num+1, num+1)
	for i := 0; i < len(slice); i++ {
		slice[i] = num - i
	}
	sliceInBytes, err:= json.Marshal(slice)
	
	if err!=nil{
	  return shim.Error(err.Error())
	}
	stub.PutState("array", sliceInBytes)
	
	return shim.Success(nil)

}
func (t *AccountChaincode) deleteAccounts(stub shim.ChaincodeStubInterface, args []string) pb.Response {

		fmt.Println("Delete accounts");
		err := stub.DelState("ACCOUNTS")
		if err != nil {
			return shim.Error(err.Error())
		}
		fmt.Println("Deleted accounts");
		return shim.Success(nil)

}

func (t *AccountChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("AccountChaincode Invoke")
	function, args := stub.GetFunctionAndParameters()
	if function == "open" {
		return t.open(stub, args)
	}
	if function == "addaccounts" {
		return t.addAccounts(stub, args)
	}
	if function == "deleteaccounts" {
		return t.deleteAccounts(stub, args)
	}
	if function == "query" {
		return t.Query(stub, args)
	}
	return shim.Error("Invalid invoke function name. ")
}

func (t *AccountChaincode) open(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	fmt.Println("new sort");
	slice, err := stub.GetState("array")
	if err != nil {
		return shim.Error(err.Error())
	}	
	stub.PutState("array", slice)	
	
	return shim.Success(nil)

}

// Quicksort
func quicksort(slice []int, left int, right int) {
	i := left
	j := right
	if i == j {
		return
	}
	m := slice[left+(right-left)/2]
	for i <= j {
		for slice[i] < m {
			i += 1
		}
		for m < slice[j] {
			j -= 1
		}
		if i <= j {
			slice[i], slice[j] = slice[j], slice[i]
			i += 1
			j -= 1
		}
	}
	if left < j {
		quicksort(slice, left, j)
	}
	if j < right {
		quicksort(slice, i, right)
	}
}

func (t *AccountChaincode) Query(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		return shim.Error("invalid args length")
	}

	money, err := stub.GetState(args[0])
	if err != nil {
		return shim.Error(err.Error())
	}
	if money == nil {
		return shim.Error("NO ACCOUNTS FOUND")
	}

	return shim.Success(money)
}

func main() {
	err := shim.Start(new(AccountChaincode))
	if err != nil {
		fmt.Printf("Error starting AccountChaincode: %s", err)
	}
}
