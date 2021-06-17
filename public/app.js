"use strict";

$(document).ready(function() {

	function formatIsk(n) {
		var c = 0,
			d = ".",
			t = ",",
			s = n < 0 ? "-" : "",
			i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
			j = (j = i.length) > 3 ? j % 3 : 0;
		return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	};

	function roundUpThousand(n) {
		return Math.ceil(n / 1000) * 1000;
	}

	function parseText(input, errors) {
		var ret = [];
		var splitted = input.split("\n");
		for (let line of splitted) {
			if (line) {
				var parts = line.trim().split("\t");
				var typename = parts[0].trim();
				var qt = parseInt(parts[1]);
				if (isNaN(qt)) {
					qt = 1;
				}
				ret.push({"typename":typename,"quantity":qt});
			}
		}
		return ret;
	}

	var market = null;
	var config = null;

	$('#pastearea').attr("disabled", true);
	$('#appraise').attr("disabled", true);
	$('#paste-area').val("loading price data...");

	$.getJSON('/jita-buy', function(result) {
		market = result;
		if (!config || !market) {
			$('#paste-area').val('');
			$("#paste-area").attr("disabled", false);
			$("#appraise").attr("disabled", false);
		}
	});

	$.getJSON('/config.json', function(result) {
		config = result;
		if (!config || !market) {
			$('#paste-area').val('');
			$("#paste-area").attr("disabled", false);
			$("#appraise").attr("disabled", false);
		}
	});

	$('#appraise').click(function() {
		$("#paste-area").attr("disabled", true);
		$("#appraise").attr("disabled", true);

		var errors = [];

		var primeTotal = 0;
		var secondaryTotal = 0;

		var items = parseText($('#paste-area').val(), errors);
		//console.log(items.length);
		for (let line of items) {
			var found = false;
			var fitem = null;

			// see if there is a fixed value override
			found = false;
			fitem = null;
			for (let item of config.fixed) {
				if (item.typename === line.typename) {
					console.log("fixed " + item.typename + " (" + line.quantity + ") [" + item.value + "]");
					fitem = item;
					found = true;
					break;
				}
			}
			if (found) {
				primeTotal += line.quantity * parseFloat(item.value);
				secondaryTotal += line.quantity * parseFloat(item.value);
				found = true;
				continue; // skip checking for anything else
			}

			// try to value the item
			// see if there is an npc buy value override
			found = false;
			fitem = null;
			for (let item of config.npcbuy) {
				if (item.typename === line.typename) {
					fitem = item;
					found = true;
					break;
				}
			}
			var extval = 0;
			if (found) {
				extval = line.quantity * fitem.value;
			} else {
				// otherwise locate the item in the market price list
				for (let item of market) {
					if (item.typename === line.typename) {
						fitem = item;
						found = true;
						break;
					}
				}
				if (found) {
					extval = line.quantity * fitem.value;
				} else {
					console.error("Failed to price \"" + line.typename + "\"");
					errors.push("Failed to price \"" + line.typename + "\"");
					continue;
				}
			}
			// note: fitem will not be null here

			// now apply specific group rates or default to buyback rate
			found = false;
			var fgroup = null;
			for (let group of config.grouprate) {
				if (fitem.groupid == group.groupid) {
					found = true;
					fgroup = group;
					break;
				}
			}
			if (found) {
				// use the group rates
				console.log("group " + fitem.typename + " (" + line.quantity + ") [" + fitem.value + "]");
				primeTotal += fgroup.primerate * extval;
				secondaryTotal += fgroup.secondaryrate * extval;
			} else {
				// default to the catch-all buyback rates
				console.log("market " + fitem.typename + " (" + line.quantity + ") [" + fitem.value + "]");
				primeTotal += config.primerate * extval;
				secondaryTotal += config.secondaryrate * extval;
			}

			found = false;
			for (let group of config.warngroups) {
				if (fitem.groupid == group.groupid) {
					found = true;
					break;
				}
			}
			if (found) {
				console.warn("\"" + fitem.typename + "\" is not accepted");
				errors.push("\"" + fitem.typename + "\" is not accepted");
			}
		}

		primeTotal = roundUpThousand(primeTotal);
		secondaryTotal = roundUpThousand(secondaryTotal);

		$('#appraisal-estimate-prime').html("&#x01B6; " + formatIsk(primeTotal));
		$('#appraisal-estimate-sub').html("&#x01B6; " + formatIsk(secondaryTotal));

		if (errors.length != 0) {
			$('#modal-title').text("Warning");
			$('#modal-text').text(errors.join("\n"));
			$('#warning-modal').modal('show');
			console.error(errors);
		}

		$('#paste-area').attr("disabled", false);
		$('#appraise').attr("disabled", false);
	});

});
