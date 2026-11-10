-- Extract a separate OSRM graph with this profile. Keep the stock profile beside it.
local stock = dofile(os.getenv('MERIDIAN_OSRM_STOCK_PROFILE') or '/opt/car.lua')
local primary = 1
local setup = stock.setup
local process_turn = stock.process_turn

stock.setup = function()
  local profile = setup()
  profile.highway_turn_classification = profile.highway_turn_classification or {}
  profile.highway_turn_classification.primary = primary
  return profile
end

stock.process_turn = function(profile, turn)
  process_turn(profile, turn)
  if not turn.is_left_hand_driving and not turn.is_u_turn
     and not turn.has_traffic_light and turn.number_of_roads >= 3
     and turn.angle < -30 and turn.angle > -150
     and turn.target_highway_turn_classification == primary
     and turn.source_highway_turn_classification ~= primary then
    turn.weight = turn.weight + 45
  end
end

return stock
