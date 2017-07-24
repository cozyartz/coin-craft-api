'use strict';
var util = require('util');
var admin = require('firebase-admin');

var serviceAccount = require("../../db-admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://coin-craft.firebaseio.com"
});

var db = admin.database();
var employeesRef = db.ref("employees");
var expensesRef = db.ref("expenses");

module.exports = {
  getEmployee: getEmployee,
  createExpense: createExpense,
  getExpenses: getExpenses
};

function getEmployee(req, res) {
  // variables defined in the Swagger document can be referenced using req.swagger.params.{parameter_name}
  var id = req.swagger.params.auth_id.value;
  var employee;

  employeesRef.orderByChild("auth_id").equalTo(id).once("value", function(snapshot) {
    var name = Object.getOwnPropertyNames(snapshot.val());
    employee = snapshot.val()[name];
    res.json(employee);
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });
}

function getExpenses(req, res) {
  // variables defined in the Swagger document can be referenced using req.swagger.params.{parameter_name}
  var id = req.swagger.params.auth_id.value;

  expensesRef.orderByChild("employee_auth_id").equalTo(id).once("value", function(snapshot) {
    var expenses = Object.getOwnPropertyNames(snapshot.val());
    var resExpenses = [];
    expenses.forEach(function(expense) {
      resExpenses.push({
        approved_by: snapshot.val()[expense].approved_by,
        client_name: snapshot.val()[expense].client_name,
        employee_auth_id: snapshot.val()[expense].employee_auth_id,
        employee_name: snapshot.val()[expense].employee_name,
        expense_amount: snapshot.val()[expense].expense_amount,
        expense_business_name: snapshot.val()[expense].expense_business_name,
        expense_description: snapshot.val()[expense].expense_description,
        expense_type: snapshot.val()[expense].expense_type,
        miles_amount: snapshot.val()[expense].miles_amount,
        receipt_date: snapshot.val()[expense].receipt_date,
        receipt_type: snapshot.val()[expense].receipt_type,
        submitted_date: snapshot.val()[expense].submitted_date
      });
    });
    res.json(resExpenses);
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });
}

function createExpense(req, res) {

  var expense = req.body;
  var amount, employee, balance;

  employeesRef.orderByChild("auth_id").equalTo(expense.employee_auth_id).once("value", function(snapshot) {
    var name = Object.getOwnPropertyNames(snapshot.val())[0];
    employee = snapshot.val()[name];

    if(expense.receipt_type == 'mileage') {
      amount = expense.miles_amount * 0.575;
    } else {
      amount = expense.expense_amount;
    }

    balance = Number(employee.current_balance) - Number(amount);

    var roundedAmount = Number((Math.round(amount * 100) / 100).toFixed(2));
    if (balance >= 0) {
      expensesRef.push({
        employee_name: employee.name,
        employee_auth_id: expense.employee_auth_id,
        submitted_date: new Date().toLocaleDateString(),
        expense_type: expense.expense_type,
        expense_amount: roundedAmount,
        receipt_type: expense.receipt_type,
        receipt_date: expense.receipt_date,
        approved_by: expense.approved_by,
        expense_business_name: expense.expense_business_name,
        miles_amount: Number((Math.round(expense.miles_amount * 100) / 100).toFixed(2)) || 0,
        client_name: expense.client_name,
        expense_description: expense.expense_description
      }).then(_ => {
        if (expense.expense_type !== "notCoinCraft") {
          var employeeRef = employeesRef.child(name);
          employeeRef.update({"current_balance": balance}).then(_ => {
            console.log("It updated!");
          }, error => {
            console.log(error);
          });
        }
        console.log("Submitted expense worked!");
      }, error => {
        console.log(error);
      });
    }
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });
}
